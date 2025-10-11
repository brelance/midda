import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import EPub from "epub";
import type {
  EpubBookData,
  EpubChapter,
  EpubMetadata,
} from "../../../../src/types/types";
import {
  EpubCoverError,
  EpubParseError,
  type EpubParseStage,
} from "./errors";

export interface ParseProgress {
  stage: EpubParseStage;
  percent?: number;
  detail?: {
    chapterId?: string;
    current?: number;
    total?: number;
  };
}

export interface ParseOptions {
  onProgress?: (progress: ParseProgress) => void;
  includeRawHtml?: boolean;
  sourcePath?: string;
}

type ChapterProgressCallback = (
  current: number,
  total: number,
  chapterId?: string
) => void;

export class EPUBService {
  async parseEpubFile(
    filePath: string,
    options: ParseOptions = {}
  ): Promise<EpubBookData> {
    const { onProgress, includeRawHtml = true, sourcePath } = options;
    const emit = (progress: ParseProgress) => onProgress?.(progress);

    emit({ stage: "initializing", percent: 5 });

    const id = await this.generateId(sourcePath ?? filePath);

    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      const handleFailure = (error: unknown, stage: EpubParseStage) => {
        if (error instanceof EpubParseError || error instanceof EpubCoverError) {
          reject(error);
          return;
        }
        reject(
          new EpubParseError(
            error instanceof Error ? error.message : "EPUB 解析失败",
            stage,
            error
          )
        );
      };

      epub.on("error", (error: unknown) => handleFailure(error, "initializing"));

      epub.on("end", async () => {
        try {
          emit({ stage: "metadata", percent: 25 });
          const metadata = this.extractMetadata(epub, sourcePath);

          emit({ stage: "cover", percent: 40 });
          let cover: string | undefined;
          try {
            cover = await this.extractCover(epub);
          } catch (error) {
            // 封面缺失并非致命错误，仅打印警告
            console.warn("封面提取失败:", error);
            if (error instanceof EpubCoverError) {
              cover = undefined;
            } else {
              cover = undefined;
            }
          }

          emit({ stage: "chapters", percent: 55 });
          const chapters = await this.extractChapters(
            epub,
            includeRawHtml,
            (current, total, chapterId) => {
              emit({
                stage: "chapters",
                percent: 55 + Math.round((current / total) * 35),
                detail: { current, total, chapterId },
              });
            }
          );

          emit({ stage: "finalizing", percent: 95 });

          resolve({
            id,
            title: metadata.title || "未知标题",
            author: this.normalizeAuthor(metadata.creator),
            cover,
            chapters,
            metadata,
            filePath,
            addedDate: new Date(),
            progress: 0,
            status: "not-started",
          });

          emit({ stage: "finalizing", percent: 100 });
        } catch (error) {
          handleFailure(error, "finalizing");
        }
      });

      epub.parse();
    });
  }

  async extractCoverFromFile(filePath: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      epub.on("error", (error: unknown) => {
        reject(
          new EpubParseError(
            error instanceof Error ? error.message : "封面解析失败",
            "cover",
            error
          )
        );
      });

      epub.on("end", async () => {
        try {
          const cover = await this.extractCover(epub);
          resolve(cover);
        } catch (error) {
          if (error instanceof EpubCoverError) {
            resolve(undefined);
          } else {
            reject(error);
          }
        }
      });

      epub.parse();
    });
  }

  private extractMetadata(epub: any, sourcePath?: string): EpubMetadata {
    const title = this.normalizeTitle(epub?.metadata?.title);
    const creator = this.normalizeCreator(epub?.metadata?.creator);
    const language = this.normalizeLanguage(epub?.metadata?.language);
    const identifier = this.normalizeIdentifier(epub?.metadata?.identifier);
    const publisher = this.normalizePublisher(epub?.metadata?.publisher);
    const description = this.normalizeDescription(epub?.metadata?.description);

    return {
      title,
      creator,
      description,
      language,
      publisher,
      identifier,
      sourcePath,
    };
  }

  private async extractCover(epub: any): Promise<string | undefined> {
    const coverId = this.resolveCoverId(epub);
    if (!coverId) {
      throw new EpubCoverError("未在 EPUB 文件中找到封面资源");
    }

    return new Promise((resolve, reject) => {
      epub.getImage(coverId, (error: unknown, data: Buffer, mimeType: string) => {
        if (error) {
          reject(new EpubCoverError("封面资源读取失败", error));
          return;
        }

        if (!data || !mimeType) {
          reject(new EpubCoverError("封面资源数据为空"));
          return;
        }

        const base64 = `data:${mimeType};base64,${data.toString("base64")}`;
        resolve(base64);
      });
    });
  }

  private async extractChapters(
    epub: any,
    includeRawHtml: boolean,
    onProgress: ChapterProgressCallback
  ): Promise<EpubChapter[]> {
    return new Promise((resolve, reject) => {
      const chapters: EpubChapter[] = [];
      const spineItems =
        (Array.isArray(epub?.spine?.contents) && epub.spine.contents) ||
        (Array.isArray(epub?.flow) && epub.flow) ||
        [];

      const total = spineItems.length;
      if (total === 0) {
        resolve([]);
        return;
      }

      let processed = 0;

      spineItems.forEach((item: any, index: number) => {
        const href: string = item?.href ?? "";
        const targetId: string = item?.id || item?.idref || href;

        if (!targetId) {
          processed += 1;
          onProgress(processed, total);
          if (processed === total) {
            resolve(chapters.sort((a, b) => a.order - b.order));
          }
          return;
        }

        epub.getChapter(targetId, (error: unknown, text: string) => {
          if (error) {
            console.warn(`获取章节 ${targetId} 失败:`, error);
          } else {
            chapters.push({
              id: targetId,
              title:
                this.extractChapterTitle(text) ??
                item?.title ??
                `章节 ${index + 1}`,
              content: includeRawHtml ? text : "",
              href,
              order: index,
            });
          }

          processed += 1;
          onProgress(processed, total, targetId);

          if (processed === total) {
            resolve(chapters.sort((a, b) => a.order - b.order));
          }
        });
      });
    });
  }

  private extractChapterTitle(content: string): string | undefined {
    if (!content) return undefined;
    const titleMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (titleMatch) {
      return titleMatch[1].replace(/<[^>]*>/g, "").trim();
    }
    return undefined;
  }

  private resolveCoverId(epub: any): string | undefined {
    const directCover = epub?.metadata?.cover;
    if (directCover) {
      return directCover;
    }

    const manifest = epub?.manifest ?? {};
    for (const key of Object.keys(manifest)) {
      const item = manifest[key];
      const id = item?.id ?? key;
      const href = item?.href ?? "";
      const properties = Array.isArray(item?.properties)
        ? item.properties.join(" ")
        : item?.properties ?? "";

      if (
        /cover/i.test(id) ||
        /cover/i.test(href) ||
        /cover/i.test(properties)
      ) {
        return id;
      }
    }

    return undefined;
  }

  private normalizeTitle(rawTitle?: string): string {
    if (!rawTitle) return "未知标题";
    return this.normalizeWhitespace(rawTitle);
  }

  private normalizeCreator(rawCreator?: string | string[]): string {
    if (Array.isArray(rawCreator)) {
      return rawCreator.map((item) => item?.trim()).filter(Boolean)[0] ?? "未知作者";
    }
    if (!rawCreator) return "未知作者";
    return this.normalizeWhitespace(rawCreator).split(/[;,]/)[0]!.trim() || "未知作者";
  }

  private normalizeAuthor(rawCreator?: string | string[]): string {
    return this.normalizeCreator(rawCreator);
  }

  private normalizeLanguage(rawLanguage?: string): string {
    if (!rawLanguage) return "unknown";
    return this.normalizeWhitespace(rawLanguage);
  }

  private normalizePublisher(rawPublisher?: string): string | undefined {
    if (!rawPublisher) return undefined;
    const normalized = this.normalizeWhitespace(rawPublisher);
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeDescription(rawDescription?: string): string | undefined {
    if (!rawDescription) return undefined;
    const normalized = this.normalizeWhitespace(rawDescription);
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeIdentifier(rawIdentifier?: string | string[]): string {
    if (Array.isArray(rawIdentifier)) {
      return rawIdentifier.map((item) => item?.trim()).filter(Boolean)[0] ?? "";
    }
    if (!rawIdentifier) return "";
    return this.normalizeWhitespace(rawIdentifier);
  }

  private normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private async generateId(filePath: string): Promise<string> {
    try {
      const stat = await fs.stat(filePath);
      const hash = createHash("sha1");
      hash.update(path.resolve(filePath));
      hash.update(String(Math.floor(stat.mtimeMs)));
      return hash.digest("base64url").slice(0, 16);
    } catch (error) {
      const hash = createHash("sha1");
      hash.update(path.resolve(filePath));
      hash.update(String(Date.now()));
      return hash.digest("base64url").slice(0, 16);
    }
  }
}
