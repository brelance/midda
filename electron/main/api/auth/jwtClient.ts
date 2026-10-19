export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}
interface BackendUser { nickname?: string; avatar?: string }
export interface JwtSession { user: AuthUser; token: TokenPair }
export interface SessionStorage {
  load(): JwtSession | null;
  save(session: JwtSession): void;
  clear(): void;
}
class HttpError extends Error {
  constructor(public status: number) {
    super(status === 401 ? '登录已过期，请重新登录。' : status === 400 ? '账号、密码或请求参数不正确。' : status === 403 ? '没有权限执行此操作。' : `后端请求失败（${status}），请稍后重试。`);
  }
}

/** Only the main process owns tokens. Epoch guards prevent late responses from reviving logout. */
export class JwtClient {
  private session: JwtSession | null = null;
  private epoch = 0;
  private refreshFlight: Promise<AuthUser | null> | null = null;
  private restoreFlight: Promise<AuthUser | null> | null = null;
  constructor(private baseUrl: string, private storage: SessionStorage, private changed: (user: AuthUser | null) => void, private transport: typeof fetch = fetch) {}
  getSession() { return { user: this.session?.user ?? null, isAuthenticated: !!this.session }; }
  private async send<T>(path: string, method = 'GET', body?: unknown, accessToken?: string): Promise<T> {
    if (!this.baseUrl) throw new Error('请配置 MIDDA_API_URL 后重启应用。');
    const url = new URL(this.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('后端地址必须为 HTTP(S) 地址。');
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new Error('无法连接后端，请检查网络和 MIDDA_API_URL 配置。'); }
    if (!response.ok) throw new HttpError(response.status);
    return response.status === 204 ? undefined as T : response.json();
  }
  private clear() { this.epoch++; this.session = null; this.refreshFlight = null; this.storage.clear(); this.changed(null); }
  async login(identifier: string, password: string): Promise<AuthUser> {
    if (!identifier?.trim() || !password) throw new Error('请输入账号和密码。');
    const epoch = ++this.epoch;
    this.refreshFlight = null;
    const result = await this.send<{ user: BackendUser; token: TokenPair }>('/auth/login', 'POST', {
      identifierType: identifier.includes('@') ? 'EMAIL' : 'PHONE', identifier: identifier.trim(), password,
    });
    // AuthUserResponse.id is a Java Long; JWT subject is a string and preserves Snowflake precision.
    // This is display mapping, not client-side signature verification; the backend validates JWTs.
    const subject: unknown = JSON.parse(Buffer.from(result.token.accessToken.split('.')[1], 'base64url').toString()).sub;
    if (typeof subject !== 'string' || !subject) throw new Error('后端返回了无效的用户身份。');
    if (epoch !== this.epoch) throw new Error('登录操作已取消。');
    const user: AuthUser = { id: subject, name: result.user.nickname || 'Midda 读者', email: identifier.includes('@') ? identifier.trim() : '', avatar: result.user.avatar, provider: 'jwt' };
    this.session = { user, token: result.token }; this.storage.save(this.session); this.changed(user);
    return user;
  }
  refresh(): Promise<AuthUser | null> {
    if (this.refreshFlight) return this.refreshFlight;
    if (!this.session) return Promise.resolve(null);
    const epoch = this.epoch;
    const current = this.session;
    const flight = (async () => {
      try {
        if (Date.parse(current.token.refreshTokenExpiresAt) <= Date.now()) { this.clear(); throw new Error('登录已过期，请重新登录。'); }
        const token = await this.send<TokenPair>('/auth/token/refresh', 'POST', { refreshToken: current.token.refreshToken });
        if (epoch !== this.epoch) return null;
        this.session = { user: current.user, token }; this.storage.save(this.session);
        return current.user;
      } catch (error) {
        if (epoch === this.epoch && error instanceof HttpError && [400, 401, 403].includes(error.status)) this.clear();
        throw error;
      }
    })();
    this.refreshFlight = flight;
    void flight.finally(() => { if (this.refreshFlight === flight) this.refreshFlight = null; }).catch(() => {});
    return flight;
  }
  restore(): Promise<AuthUser | null> {
    if (this.restoreFlight) return this.restoreFlight;
    const epoch = this.epoch;
    const flight = (async () => {
      if (!this.session) this.session = this.storage.load();
      if (!this.session) return null;
      try {
        const profile = await this.request<BackendUser>('/auth/me');
        if (epoch !== this.epoch || !this.session) return null;
        this.session.user = { ...this.session.user, name: profile.nickname || 'Midda 读者', avatar: profile.avatar };
        this.storage.save(this.session); this.changed(this.session.user);
        return this.session.user;
      } catch (error) {
        // Keep encrypted credentials on transient outages, but do not claim a validated session.
        if (epoch === this.epoch) { this.session = null; this.changed(null); }
        throw error;
      }
    })();
    this.restoreFlight = flight;
    void flight.finally(() => { if (this.restoreFlight === flight) this.restoreFlight = null; }).catch(() => {});
    return flight;
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const epoch = this.epoch;
    if (this.session && Date.parse(this.session.token.accessTokenExpiresAt) <= Date.now() + 60000) await this.refresh();
    if (epoch !== this.epoch) throw new Error('登录状态已变化，请重试。');
    const accessToken = this.session?.token.accessToken;
    try { return await this.send<T>(path, method, body, accessToken); }
    catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401 || !accessToken || epoch !== this.epoch) throw error;
      // Another concurrent request may already have rotated this token.
      if (this.session?.token.accessToken === accessToken) await this.refresh();
      if (!this.session || epoch !== this.epoch) throw new Error('登录已过期，请重新登录。');
      try { return await this.send<T>(path, method, body, this.session.token.accessToken); }
      catch (retryError) { if (retryError instanceof HttpError && retryError.status === 401 && epoch === this.epoch) this.clear(); throw retryError; }
    }
  }
  async logout(): Promise<void> {
    const refreshToken = this.session?.token.refreshToken;
    this.clear(); // Local logout must succeed even offline.
    if (refreshToken) {
      try { await this.send('/auth/logout', 'POST', { refreshToken }); }
      catch { throw new Error('已在本机退出，但服务端撤销失败；请检查网络，旧会话将在到期后失效。'); }
    }
  }
}

// Fixed-origin, allowlisted API proxy; renderer cannot request token endpoints or arbitrary URLs.
export function isAllowedBackendRequest(path: string, method: string): boolean {
  if (typeof path !== 'string' || /[\\#%]/.test(path)) return false;
  if (method === 'GET') return /^\/knowposts\/(feed|mine)(\?page=\d+&size=\d+)?$/.test(path) || /^\/knowposts\/detail\/\d+$/.test(path);
  if (method === 'POST') return /^\/action\/(like|unlike|fav|unfav)$/.test(path) || path === '/storage/presign' || path === '/knowposts/drafts' || /^\/knowposts\/\d+\/(content\/confirm|publish)$/.test(path);
  return method === 'PATCH' && /^\/knowposts\/\d+$/.test(path);
}
