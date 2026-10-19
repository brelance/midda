import type { CommunityPost } from '../../services/community';

export const demoPosts: CommunityPost[] = [
  { id: 'demo-1', title: '读原版书，不必从看懂每一个单词开始', description: '最近用 Midda 重读《小王子》，试着先完整读完一段，再回头整理生词。把注意力从翻译转回故事，阅读终于不再是一场查词比赛。\n\n我的方法是每天 20 分钟：第一遍只读故事，第二遍挑出真正影响理解的词，最后用自己的话复述。你们是怎样开始原版阅读的？', tags: ['原版阅读', '阅读方法'], authorNickname: '林间读书人', likeCount: 128, favoriteCount: 42, liked: false, faved: false },
  { id: 'demo-2', title: '从《Atomic Habits》里带走的，不只是一份笔记', description: '不要急着设定一年读完 50 本书的目标。先把书放在每天会看到的地方，让每天读两页成为一个足够容易的开始。\n\n阅读习惯的建立，也许比阅读速度更重要。分享一下你的阅读环境吧。', tags: ['读书笔记', '习惯养成'], authorNickname: '页边空白', likeCount: 86, favoriteCount: 31, liked: false, faved: false },
  { id: 'demo-3', title: '日语入门后，我用漫画搭了一座桥', description: '从短对话和生活场景入手，比一开始就挑战长篇小说轻松很多。借助 OCR 整理对话中的表达，再把句子读出声，是我最近最喜欢的练习方式。', tags: ['语言学习', '漫画阅读'], authorNickname: 'Momo', likeCount: 64, favoriteCount: 27, liked: false, faved: false },
  { id: 'demo-4', title: '收藏的单词越来越多，真正记住的有多少？', description: '这周开始给生词做减法：只保留在不同章节反复遇到的词，并附上原句。复习时先想起那个故事，再想起单词。\n\n不是收集更多，而是和少量词汇多见几次面。', tags: ['语言学习', '阅读方法'], authorNickname: '慢慢来', likeCount: 53, favoriteCount: 19, liked: false, faved: false },
];
