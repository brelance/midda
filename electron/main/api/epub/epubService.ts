import EPub from 'epub';
// 类型定义
interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  language: string;
  publisher?: string;
  identifier: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
}

interface EpubBookData {
  id: string;
  title: string;
  author: string;
  cover?: string;
  chapters: Chapter[];
  metadata: EpubMetadata;
  filePath: string;
  addedDate: Date;
  progress: number;
  status: 'not-started' | 'reading' | 'completed';
}

export class EPUBService {
  async parseEpubFile(filePath: string): Promise<EpubBookData> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      epub.on('end', async () => {
        try {
          const metadata = await this.extractMetadata(epub);
          const cover = await this.extractCover(epub);
          const chapters = await this.extractChapters(epub);

          resolve({
            id: this.generateId(filePath),
            title: metadata.title || '未知标题',
            author: metadata.creator || '未知作者',
            cover,
            chapters,
            metadata,
            filePath,
            addedDate: new Date(),
            progress: 0,
            status: 'not-started'
          });
        } catch (error) {
          reject(error);
        }
      });

      epub.on('error', reject);
      epub.parse();
    });
  }

  async extractCover(epub: any): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      // 尝试获取封面
      if (epub.metadata.cover) {
        epub.getImage(epub.metadata.cover, (error: any, data: Buffer, mimeType: string) => {
          if (error) {
            reject(error);
          } else if (data) {
            const base64 = `data:${mimeType};base64,${data.toString('base64')}`;
            resolve(base64);
          } else {
            resolve(undefined);
          }
        });
      } else {
        resolve(undefined);
      }
    });
  }

  private async extractMetadata(epub: any): Promise<EpubMetadata> {
    return {
      title: epub.metadata.title || '未知标题',
      creator: epub.metadata.creator || '未知作者',
      description: epub.metadata.description,
      language: epub.metadata.language || 'unknown',
      publisher: epub.metadata.publisher,
      identifier: epub.metadata.identifier || ''
    };
  }

  private async extractChapters(epub: any): Promise<Chapter[]> {
    return new Promise((resolve) => {
      const chapters: Chapter[] = [];
      const spineItems =
        (Array.isArray(epub?.spine?.contents) && epub.spine.contents) ||
        (Array.isArray(epub?.flow) && epub.flow) ||
        [];
      let processedCount = 0;

      if (spineItems.length === 0) {
        resolve([]);
        return;
      }

      spineItems.forEach((item: any, index: number) => {
        const href = item.href;
        const targetId = item.id || item.idref || item.href;

        if (!targetId) {
          processedCount++;
          if (processedCount === spineItems.length) {
            chapters.sort((a, b) => a.order - b.order);
            resolve(chapters);
          }
          return;
        }

        epub.getChapter(targetId, async (error: any, text: string) => {
          if (error) {
            console.error(`获取章节 ${targetId} 失败:`, error);
          } else {
            chapters.push({
              id: targetId,
              title: this.extractChapterTitle(text) || `章节 ${index + 1}`,
              content: text,
              href,
              order: index
            });
          }

          processedCount++;
          if (processedCount === spineItems.length) {
            // 按order排序
            chapters.sort((a, b) => a.order - b.order);
            resolve(chapters);
          }
        });
      });
    });
  }

  private extractChapterTitle(content: string): string | undefined {
    // 尝试从HTML内容中提取标题
    const titleMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (titleMatch) {
      return titleMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    return undefined;
  }

  private generateId(filePath: string): string {
    return Buffer.from(filePath + Date.now()).toString('base64').slice(0, 16);
  }
}
