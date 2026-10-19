import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { JwtClient, type AuthUser, type JwtSession } from './jwtClient';
export type { AuthUser } from './jwtClient';

declare const __MIDDA_API_URL__: string;
const baseUrl = __MIDDA_API_URL__;
let callback: (user: AuthUser | null) => void = () => {};
const tokenFile = () => path.join(app.getPath('userData'), '.midda-jwt-session');
function clearFile() { try { fs.rmSync(tokenFile(), { force: true }); } catch { /* Best effort; logout still clears memory. */ } }
function secureStorageAvailable() {
  return safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
}
const client = new JwtClient(baseUrl, {
  load() {
    if (!secureStorageAvailable()) return null;
    try {
      const saved = JSON.parse(safeStorage.decryptString(fs.readFileSync(tokenFile()))) as { baseUrl: string; session: JwtSession };
      if (saved.baseUrl !== baseUrl || !saved.session?.token?.refreshToken || !saved.session.user?.id) return null;
      return saved.session;
    } catch { return null; }
  },
  save(session) {
    if (!secureStorageAvailable()) { clearFile(); return; } // Never fall back to plaintext.
    try {
      const temporary = `${tokenFile()}.tmp`;
      fs.writeFileSync(temporary, safeStorage.encryptString(JSON.stringify({ baseUrl, session })), { mode: 0o600 });
      fs.renameSync(temporary, tokenFile());
    } catch { console.warn('[Auth] 无法安全保存会话，本次登录仍在内存中有效。'); }
  },
  clear: clearFile,
}, user => callback(user));
export function setAuthStateCallback(cb: (user: AuthUser | null) => void) { callback = cb; }
export const login = (identifier: string, password: string) => client.login(identifier, password);
export const getSession = () => client.getSession();
export const restoreSession = () => client.restore();
export const refreshSession = () => client.refresh();
export const logout = () => client.logout();
export const backendRequest = (url: string, method: string, body?: unknown) => client.request(url, method, body);
