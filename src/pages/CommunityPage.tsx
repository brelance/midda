import { useEffect, useRef, useState } from 'react';
import { communityAction, getCommunityDetail, getCommunityFeed, isCommunityDemo, publishCommunityPost, safeCommunityUrl, type CommunityPost } from '../services/community';
import { demoPosts } from './community/demo';
import PostCover from './community/PostCover';
import '../styles/community.css';
import { useAuthStore } from '../stores/authStore';
import BackendLoginForm from '../components/sidebar/BackendLoginForm';

const topics = ['全部', '原版阅读', '读书笔记', '语言学习', '阅读方法'];
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试。';

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>(isCommunityDemo ? demoPosts : []);
  const authUser = useAuthStore(s => s.user);
  const user = authUser?.name;
  const userId = authUser?.id;
  const previousUserId = useRef(userId);
  const latestUserId = useRef(userId);
  latestUserId.current = userId;
  const [mine, setMine] = useState(false);
  const [topic, setTopic] = useState('全部');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<'login' | 'compose' | null>(null);
  const [selected, setSelected] = useState<CommunityPost | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const actionLocks = useRef(new Set<string>());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('读书笔记');
  const draftId = useRef<string | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedId = selected?.id;
  useEffect(() => { if (panel || selectedId) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [panel, selectedId]);

  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    if (!isCommunityDemo) setPosts([]);
    setMine(false); setPage(1); setSelected(null); setPanel(null);
    draftId.current = null;
    detailRequest.current?.abort();
  }, [userId]);

  useEffect(() => {
    if (isCommunityDemo) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    getCommunityFeed(page, mine, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPosts(previous => page === 1 ? result.items : [...previous, ...result.items.filter(item => !previous.some(p => p.id === item.id))]);
      setHasMore(result.hasMore);
    }).catch(err => { if (!controller.signal.aborted) { setError(errorMessage(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, mine, revision, userId]);

  useEffect(() => () => detailRequest.current?.abort(), []);

  function refresh() { setPage(1); setRevision(value => value + 1); }
  function requireLogin() {
    if (!isCommunityDemo && !useAuthStore.getState().user) { setPanel('login'); return false; }
    return true;
  }
  async function openDetail(post: CommunityPost) {
    detailRequest.current?.abort();
    setSelected(post);
    if (isCommunityDemo) return;
    const controller = new AbortController(); detailRequest.current = controller;
    setDetailLoading(true);
    try {
      const detail = await getCommunityDetail(post.id, controller.signal);
      if (!controller.signal.aborted) setSelected(detail);
    } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  }
  async function interact(post: CommunityPost, kind: 'like' | 'fav') {
    if (!requireLogin() || actionLocks.current.has(post.id)) return;
    actionLocks.current.add(post.id); setPending([...actionLocks.current]); setError('');
    const field = kind === 'like' ? 'liked' : 'faved';
    const count = kind === 'like' ? 'likeCount' : 'favoriteCount';
    try {
      const result = isCommunityDemo ? { [field]: !post[field], changed: true } : await communityAction(post.id, post[field] ? (kind === 'like' ? 'unlike' : 'unfav') : kind);
      if (latestUserId.current !== userId) return;
      const next = Boolean(result[field]);
      const update = (p: CommunityPost) => p.id === post.id ? { ...p, [field]: next, [count]: Math.max(0, p[count] + (result.changed ? (next ? 1 : -1) : 0)) } : p;
      setPosts(items => items.map(update)); setSelected(p => p ? update(p) : p);
    } catch (err) { setError(errorMessage(err)); }
    finally { actionLocks.current.delete(post.id); setPending([...actionLocks.current]); }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault(); if (busy || !title.trim() || !content.trim()) return;
    setBusy(true); setError('');
    const input = { title: title.trim(), content: content.trim(), tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 20) };
    try {
      if (isCommunityDemo) {
        setPosts(items => [{ id: `demo-${Date.now()}`, title: input.title, description: input.content, tags: input.tags, authorNickname: '我（演示）', likeCount: 0, favoriteCount: 0, liked: false, faved: false }, ...items]);
        setNotice('演示心得已添加，仅保留在当前页面，不会写入后端。');
      } else {
        await publishCommunityPost(input, draftId.current, id => { draftId.current = id; }, () => latestUserId.current === userId);
        setNotice('发布成功。后端 Feed 有短期缓存，如未出现请稍后刷新。'); refresh();
      }
      draftId.current = null; setTitle(''); setContent(''); setPanel(null); setTopic('全部'); setQuery('');
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  const visiblePosts = posts.filter(p => (topic === '全部' || p.tags?.includes(topic)) && `${p.title} ${p.description} ${p.authorNickname}`.toLowerCase().includes(query.toLowerCase()));
  function actions(post: CommunityPost) {
    return <div className="community-actions">
      <button disabled={pending.includes(post.id)} aria-pressed={post.liked} onClick={() => void interact(post, 'like')}>♡ {post.likeCount ?? 0} <span>赞同</span></button>
      <button disabled={pending.includes(post.id)} aria-pressed={post.faved} onClick={() => void interact(post, 'fav')}>☆ {post.favoriteCount ?? 0} <span>收藏</span></button>
    </div>;
  }

  return <main className="community-page">
    <header className="community-header"><div><span className="community-eyebrow">MIDDA / COMMUNITY</span><h1>阅读社区</h1></div>
      <div className="community-header-actions"><span className="community-mode">{isCommunityDemo ? '演示模式' : '后端已配置'}</span>
        {!isCommunityDemo && (user ? <span>{user}</span> : <button onClick={() => setPanel('login')}>登录 Midda</button>)}
        <button className="community-primary" onClick={() => { if (requireLogin()) setPanel('compose'); }}>＋ 分享心得</button>
      </div>
    </header>
    <div className="community-body">
      <section className="community-intro"><div><span className="community-eyebrow">READ & CONNECT</span><h2>发现阅读的另一种可能<span>。</span></h2><p>读书笔记、语言学习、片刻灵感。在这里，遇见同频的读者。</p></div><span className="community-intro-mark" aria-hidden="true">好书<br />共读 ↗</span></section>
      {isCommunityDemo && <p className="community-demo-note">演示模式 · 示例内容与互动仅保留在当前页面。配置 MIDDA_API_URL 后连接真实社区。</p>}
      {error && <div className="community-alert" role="alert">{error} <button onClick={() => setError('')}>关闭</button></div>}
      {notice && <div className="community-notice" role="status">{notice} <button onClick={() => setNotice('')}>关闭</button></div>}
      <section className="community-feed" aria-label="社区动态">
        <div className="community-feed-toolbar"><div className="community-tabs"><button aria-pressed={!mine} onClick={() => { if (mine) { setMine(false); setPosts([]); setPage(1); } }}>最新分享</button>{!isCommunityDemo && <button aria-pressed={mine} onClick={() => { if (requireLogin() && !mine) { setMine(true); setPosts([]); setPage(1); } }}>我的发布</button>}</div><button disabled={loading} onClick={refresh}>↻ 刷新</button></div>
        <label className="community-search"><span>⌕</span><input aria-label="筛选已加载的分享" placeholder="搜索已加载的分享、作者…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="community-topics">{topics.map(t => <button key={t} aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>)}</div>
        <div className="community-masonry" aria-busy={loading}>{visiblePosts.map(post => <article className="community-card" key={post.id}>
          <button className="community-post-open" onClick={() => void openDetail(post)} aria-label={`阅读：${post.title || '未命名分享'}`}>
            <PostCover post={post} />
            <h3>{post.title || '未命名分享'}</h3>
          </button>
          <div className="community-card-tags">{post.tags?.slice(0, 2).map(t => <span key={t}># {t}</span>)}</div>
          <footer><div className="community-author"><span className="community-avatar">{post.authorNickname?.slice(0, 1) || '读'}</span><span className="community-author-name">{post.authorNickname || '阅读者'}</span></div>
            <button className="community-card-like" disabled={pending.includes(post.id)} aria-label={`${post.liked ? '取消点赞' : '点赞'}：${post.title}`} aria-pressed={post.liked} onClick={() => void interact(post, 'like')}><svg viewBox="0 0 24 24" width="18" height="18" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" /></svg><span>{post.likeCount ?? 0}</span></button>
          </footer>
        </article>)}</div>
        {loading && <div className="community-empty" role="status">正在加载阅读分享…</div>}
        {!loading && visiblePosts.length === 0 && <div className="community-empty"><h3>{error ? '暂时无法加载社区' : '这里还没有分享'}</h3><p>{query || topic !== '全部' ? '试试其他关键词或话题，也可以继续加载更多。' : '刷新重试，或成为第一个分享阅读心得的人。'}</p><button onClick={refresh}>重新加载</button></div>}
        {!isCommunityDemo && hasMore && <button className="community-load" disabled={loading || !!error} onClick={() => setPage(p => p + 1)}>加载更多</button>}
        {!loading && visiblePosts.length > 0 && <p className="community-end">{hasMore ? '话题与搜索仅筛选已加载内容' : '阅读没有终点，分享也是。'}</p>}
      </section>
      <p className="community-guidelines">尊重不同观点 · 引用注明出处 · 不上传未经授权的整本书籍</p>
      {(panel || selected) && <section ref={editorRef} className="community-editor" aria-label={panel === 'login' ? '社区账号登录' : panel === 'compose' ? '撰写阅读心得' : '分享详情'}>
        <div className="community-editor-heading"><h2>{panel === 'login' ? '登录社区账号' : panel === 'compose' ? '分享你的阅读心得' : selected?.title}</h2><button disabled={busy} onClick={() => { setPanel(null); setSelected(null); detailRequest.current?.abort(); setDetailLoading(false); }}>关闭 ×</button></div>
        {error && <p className="community-alert" role="alert">{error}</p>}
        {panel === 'login' ? <BackendLoginForm onSuccess={() => { setPanel(null); refresh(); }} />
          : panel === 'compose' ? <form onSubmit={publish}><p>{isCommunityDemo ? '演示发布只保留在当前页面。' : '内容将公开发布。正文以 Markdown 文件直传 OSS，失败可保留草稿重试。'}</p><label>标题<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label>正文<textarea required rows={8} maxLength={50000} placeholder="最近读了什么？有哪些让你停下来思考的句子？" value={content} onChange={e => setContent(e.target.value)} /></label><label>话题（逗号分隔，最多 20 个）<input value={tags} onChange={e => setTags(e.target.value)} /></label>{draftId.current && <p>草稿 ID：{draftId.current}，重试将复用此草稿。</p>}<button className="community-primary" disabled={busy || !title.trim() || !content.trim()}>{busy ? '正在上传并发布…' : '发布心得'}</button></form>
          : selected && <div><p className="community-detail-author">{selected.authorNickname}</p><p className="community-detail-text">{selected.description}</p>{detailLoading ? <p role="status">正在加载详情…</p> : safeCommunityUrl(selected.contentUrl) ? <a className="community-original" href={safeCommunityUrl(selected.contentUrl)} target="_blank" rel="noopener noreferrer">打开正文原文 ↗</a> : !isCommunityDemo && <p>此分享暂无可访问的正文链接。</p>}{actions(selected)}</div>}
      </section>}
    </div>
  </main>;
}
