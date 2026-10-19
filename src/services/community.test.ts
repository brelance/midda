import assert from 'node:assert/strict';
import test from 'node:test';
import { publishCommunityPost, safeCommunityUrl } from './community';

test('only HTTP(S) content URLs are allowed', () => {
  assert.equal(safeCommunityUrl('javascript:alert(1)'), undefined);
  assert.equal(safeCommunityUrl('file:///etc/passwd'), undefined);
  assert.equal(safeCommunityUrl('https://example.com/a.md'), 'https://example.com/a.md');
});

test('publisher uses IPC for API, no JWT for OSS, reuses string draft ID', async () => {
  const originalFetch = globalThis.fetch;
  const oldWindow = globalThis.window;
  const calls: { path: string; body?: unknown }[] = [];
  const request = async (path: string, _method: string, body?: unknown) => {
    calls.push({ path, body });
    if (path.endsWith('/drafts')) return { id: '9223372036854775800' };
    if (path.endsWith('/presign')) return { putUrl: 'https://oss.example.com/content.md', objectKey: 'posts/content.md', headers: { 'Content-Type': 'text/markdown' } };
  };
  globalThis.window = { api: { auth: { request } } } as unknown as Window & typeof globalThis;
  globalThis.fetch = async (_url, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
    return new Response(null, { headers: { ETag: 'etag' } });
  };
  try {
    let draft = '';
    const input = { title: 'Title', content: '中文正文📚'.repeat(15), tags: ['阅读'] };
    await publishCommunityPost(input, null, id => { draft = id; });
    assert.equal(draft, '9223372036854775800');
    const body = calls.find(c => c.path.endsWith('/content/confirm'))?.body as { size: number; sha256: string };
    assert.equal(body.size, new TextEncoder().encode(input.content).byteLength);
    assert.equal(body.sha256.length, 64);
    const metadata = calls.find(c => c.path === `/knowposts/${draft}`)?.body as { description: string };
    assert.equal(metadata.description, '中文正文📚'.repeat(10)); // MySQL VARCHAR(50), preserving Unicode characters.
    await publishCommunityPost(input, draft, () => {});
    assert.equal(calls.filter(c => c.path.endsWith('/drafts')).length, 1);
    await assert.rejects(publishCommunityPost(input, draft, () => {}, () => false), /登录状态已变化/);
  } finally { globalThis.fetch = originalFetch; globalThis.window = oldWindow; }
});
