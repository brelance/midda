import test from 'node:test';
import assert from 'node:assert/strict';
import { JwtClient, isAllowedBackendRequest, type JwtSession } from './jwtClient';
const token = (suffix = '', expired = false) => ({
  accessToken: `header.${Buffer.from(JSON.stringify({ sub: '9223372036854775800' })).toString('base64url')}.sig${suffix}`,
  refreshToken: `refresh${suffix}`,
  accessTokenExpiresAt: new Date(Date.now() + (expired ? -1000 : 3600000)).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
});
function harness(transport: typeof fetch) {
  let saved: JwtSession | null = null;
  const changes: unknown[] = [];
  const storage = { load: () => saved, save: (value: JwtSession) => { saved = value; }, clear: () => { saved = null; } };
  return { client: new JwtClient('http://localhost:8080', storage, user => changes.push(user), transport), storage, changes };
}

test('login preserves Snowflake identity and uses backend login DTO', async () => {
  const { client, storage } = harness(async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { identifierType: 'EMAIL', identifier: 'a@b.com', password: 'pw' });
    return Response.json({ user: { nickname: 'Reader', id: 9223372036854775800 }, token: token() });
  });
  const user = await client.login('a@b.com', 'pw');
  assert.equal(user.id, '9223372036854775800');
  assert.equal(user.provider, 'jwt');
  assert.ok(storage.load()?.token.refreshToken);
});

test('concurrent expired requests share one refresh and use rotated token', async () => {
  let refreshes = 0;
  const { client } = harness(async (url, init) => {
    if (String(url).endsWith('/login')) return Response.json({ user: {}, token: token('', true) });
    if (String(url).endsWith('/token/refresh')) { refreshes++; await new Promise(r => setTimeout(r, 10)); return Response.json(token('new')); }
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token('new').accessToken}`);
    return Response.json({ ok: true });
  });
  await client.login('123456', 'pw');
  await Promise.all([client.request('/knowposts/feed'), client.request('/knowposts/feed')]);
  assert.equal(refreshes, 1);
});

test('401 retries once with refresh, invalid refresh clears persisted session', async () => {
  let refreshes = 0;
  let reads = 0;
  const { client, storage } = harness(async url => {
    if (String(url).endsWith('/login')) return Response.json({ user: {}, token: token() });
    if (String(url).endsWith('/token/refresh')) { refreshes++; return new Response(null, { status: 401 }); }
    reads++; return new Response(null, { status: 401 });
  });
  await client.login('123456', 'pw');
  await assert.rejects(client.request('/knowposts/feed'), /登录已过期/);
  assert.equal(refreshes, 1); assert.equal(reads, 1);
  assert.equal(client.getSession().user, null); assert.equal(storage.load(), null);
});

test('logout while refresh is pending cannot restore logged-out session', async () => {
  let release!: (response: Response) => void;
  const { client, storage } = harness(async url => {
    if (String(url).endsWith('/login')) return Response.json({ user: {}, token: token() });
    if (String(url).endsWith('/token/refresh')) return new Promise<Response>(resolve => { release = resolve; });
    return new Response(null, { status: 204 });
  });
  await client.login('123456', 'pw');
  const refresh = client.refresh();
  await client.logout();
  release(Response.json(token('new')));
  assert.equal(await refresh, null);
  assert.equal(client.getSession().user, null); assert.equal(storage.load(), null);
});

test('transient restore failure retains encrypted storage for later retry', async () => {
  let offline = false;
  const { client, storage } = harness(async url => {
    if (offline) throw new Error('offline');
    if (String(url).endsWith('/login')) return Response.json({ user: {}, token: token() });
    return Response.json({ nickname: 'Restored' });
  });
  await client.login('123456', 'pw'); offline = true;
  await assert.rejects(client.restore(), /无法连接后端/);
  assert.ok(storage.load()); assert.equal(client.getSession().user, null);
  offline = false; assert.equal((await client.restore())?.name, 'Restored');
});

test('IPC proxy refuses token routes and arbitrary destinations', () => {
  assert.ok(isAllowedBackendRequest('/knowposts/feed?page=1&size=12', 'GET'));
  assert.ok(isAllowedBackendRequest('/knowposts/9223372036854775800/content/confirm', 'POST'));
  for (const path of ['/auth/token/refresh', 'https://evil.test', '//evil.test', '/knowposts/../auth/me', '/knowposts/%2e%2e/auth/me']) {
    assert.equal(isAllowedBackendRequest(path, 'POST'), false);
  }
});
