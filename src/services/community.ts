export interface CommunityPost {
  id: string;
  title: string;
  description: string;
  tags: string[];
  authorNickname: string;
  coverImage?: string;
  likeCount: number;
  favoriteCount: number;
  liked: boolean;
  faved: boolean;
  contentUrl?: string;
}
export interface FeedPage { items: CommunityPost[]; page: number; hasMore: boolean }

export const communityBaseUrl = (import.meta.env?.VITE_COMMUNITY_API_URL || '').replace(/\/$/, '');
export const isCommunityDemo = !communityBaseUrl;
async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  // Tokens never enter the renderer. The main process handles expiry and single-flight refresh.
  const result = await window.api.auth.request<T>(path, method, body);
  signal?.throwIfAborted(); // IPC is not cancellable; discard stale results at the boundary.
  return result;
}
export const getCommunityFeed = (page: number, mine: boolean, signal?: AbortSignal) =>
  request<FeedPage>(`/knowposts/${mine ? 'mine' : 'feed'}?page=${page}&size=12`, 'GET', undefined, signal);
export const getCommunityDetail = (id: string, signal?: AbortSignal) =>
  request<CommunityPost>(`/knowposts/detail/${encodeURIComponent(id)}`, 'GET', undefined, signal);
export const communityAction = (id: string, action: 'like' | 'unlike' | 'fav' | 'unfav') =>
  request<{ changed: boolean; liked?: boolean; faved?: boolean }>(`/action/${action}`, 'POST', { entityType: 'knowpost', entityId: id });

export function safeCommunityUrl(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

/** Reuse the same draft after a failed upload/publish rather than creating duplicates. */
export async function publishCommunityPost(input: { title: string; content: string; tags: string[] }, draftId: string | null, onDraft: (id: string) => void, isCurrentSession: () => boolean = () => true) {
  const checkSession = () => { if (!isCurrentSession()) throw new Error('登录状态已变化，发布已停止。'); };
  checkSession();
  const id = draftId ?? (await request<{ id: string }>('/knowposts/drafts', 'POST')).id;
  checkSession();
  onDraft(id);
  const upload = await request<{ putUrl: string; objectKey: string; headers: Record<string, string> }>('/storage/presign', 'POST', {
    scene: 'knowpost_content', postId: id, contentType: 'text/markdown', ext: '.md',
  });
  if (!safeCommunityUrl(upload.putUrl)) throw new Error('后端返回了无效的上传地址。');
  const bytes = new TextEncoder().encode(input.content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  // Never forward API Authorization to OSS.
  const response = await fetch(upload.putUrl, { method: 'PUT', headers: upload.headers, body: bytes, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error('正文上传失败，可保留草稿重试。');
  const etag = response.headers.get('ETag');
  if (!etag) throw new Error('无法读取上传 ETag，请在 OSS CORS 中暴露 ETag 响应头。');
  checkSession();
  await request(`/knowposts/${id}/content/confirm`, 'POST', { objectKey: upload.objectKey, etag, size: bytes.byteLength, sha256 });
  checkSession();
  await request(`/knowposts/${id}`, 'PATCH', { title: input.title, description: Array.from(input.content).slice(0, 50).join(''), tags: input.tags, visible: 'public' });
  checkSession();
  await request(`/knowposts/${id}/publish`, 'POST');
  return id;
}
