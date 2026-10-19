import { useState } from 'react';
import { safeCommunityUrl, type CommunityPost } from '../../services/community';

/** Stable cover styling avoids layout/color changes when filtering or paging. */
export default function PostCover({ post }: { post: CommunityPost }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = safeCommunityUrl(post.coverImage);
  const variant = Array.from(post.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
  return <div className={`community-cover community-cover-${variant}`}>
    {url && failedUrl !== url ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} /> : <div className="community-cover-art" aria-hidden="true">
      <span className="community-cover-kicker">{post.tags?.[0] || '阅读分享'} / READING NOTES</span>
      <span className="community-cover-decoration">{['Aa', '“', '読む', 'BOOK', '慢读', '✳'][variant]}</span>
      <strong>{post.title || '留一点时间给阅读'}</strong>
      <span className="community-cover-rule" />
      <span className="community-cover-signature">MIDDA <span>读到这里，想到那里。</span></span>
    </div>}
    <span className="community-cover-badge">{post.tags?.[0] || '阅读分享'}</span>
  </div>;
}
