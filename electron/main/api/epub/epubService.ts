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

interface ResolvedTocEntry {
  manifestId: string | undefined;
  href?: string;
  title?: string;
}

interface ManifestIndex {
  byId: Map<string, any>;
  hrefToId: Map<string, string>;
  navEntries: Array<{ id: string; href: string }>;
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
    const manifestIndex = this.buildManifestIndex(epub);
    const tocEntries = await this.extractTocEntries(epub, manifestIndex);
    const entries =
      tocEntries.length > 0
        ? tocEntries
        : this.buildFallbackSpineEntries(epub, manifestIndex);

    const total = entries.length;
    if (total === 0) {
      return [];
    }

    const chapters: EpubChapter[] = [];
    const visited = new Set<string>();
    let processed = 0;

    for (const entry of entries) {
      const manifestId = entry.manifestId;

      if (!manifestId || visited.has(manifestId)) {
        processed += 1;
        onProgress(processed, total, manifestId);
        continue;
      }

      visited.add(manifestId);
      const manifestItem = manifestIndex.byId.get(manifestId) ?? {};
      const defaultHref = typeof manifestItem.href === "string" ? manifestItem.href : "";
      const chapterHref = entry.href ?? defaultHref;

      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => {
        epub.getChapter(manifestId, (error: unknown, text: string) => {
          if (error) {
            console.warn(`获取章节 ${manifestId} 失败:`, error);
          } else {
            const normalizedText =
              typeof text === "string" ? text : String(text ?? "");
            if (this.hasRenderableContent(normalizedText)) {
              const orderIndex = chapters.length;
              const chapterTitle =
                entry.title?.trim() ||
                this.extractChapterTitle(normalizedText) ||
                `章节 ${orderIndex + 1}`;
              chapters.push({
                id: manifestId,
                title: chapterTitle,
                content: includeRawHtml ? normalizedText : "",
                href: chapterHref,
                order: orderIndex,
              });
            } else {
              console.warn(`章节 ${manifestId} 无有效内容，已跳过`);
            }
          }

          processed += 1;
          onProgress(processed, total, manifestId);
          resolve();
        });
      });
    }

    return chapters;
  }

  private extractChapterTitle(content: string): string | undefined {
    if (!content) return undefined;
    const titleMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (titleMatch) {
      return titleMatch[1].replace(/<[^>]*>/g, "").trim();
    }
    return undefined;
  }

  private hasRenderableContent(text: string): boolean {
    const plainText = text.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    if (plainText.length > 0) {
      return true;
    }

    const hasMediaTag = /<(img|svg|video|audio)\b[^>]*>/i.test(text);
    if (!hasMediaTag) {
      return false;
    }

    if (/<svg\b/i.test(text)) {
      return true;
    }

    const hasMediaSource = /<(img|video|audio)\b[^>]*(src|data)\s*=\s*['"][^'"]+/i.test(
      text
    );
    return hasMediaSource;
  }

  private buildManifestIndex(epub: any): ManifestIndex {
    const manifest = epub?.manifest ?? {};
    const byId = new Map<string, any>();
    const hrefToId = new Map<string, string>();
    const navEntries: Array<{ id: string; href: string }> = [];

    Object.entries(manifest as Record<string, unknown>).forEach(
      ([id, rawItem]) => {
        const item = (rawItem ?? {}) as { href?: unknown; properties?: unknown };
      byId.set(id, item);

      if (typeof item.href === "string") {
        const normalized = this.normalizeZipPath(item.href);
        hrefToId.set(normalized, id);
      }

      if (
        typeof item.properties === "string" &&
        item.properties
          .split(/\s+/)
          .filter(Boolean)
          .includes("nav")
      ) {
        const normalizedHref =
          typeof item.href === "string" ? this.normalizeZipPath(item.href) : "";
        navEntries.push({ id, href: normalizedHref });
      }
      }
    );

    return { byId, hrefToId, navEntries };
  }

  private async extractTocEntries(
    epub: any,
    manifestIndex: ManifestIndex
  ): Promise<ResolvedTocEntry[]> {
    const baseToc = Array.isArray(epub?.toc) ? epub.toc : [];
    if (baseToc.length > 0) {
        return baseToc
          .map((tocItem: any) => {
          const hrefValue = typeof tocItem?.href === "string" ? tocItem.href : "";
          const normalizedHref = this.normalizeZipPath(
            hrefValue.split("#")[0] ?? hrefValue
          );
          const manifestId = manifestIndex.hrefToId.get(normalizedHref);
          if (!manifestId) {
            return null;
          }
          const manifestItem = manifestIndex.byId.get(manifestId) ?? {};
          return {
            manifestId,
            href: manifestItem.href ?? hrefValue,
            title: tocItem?.title ?? tocItem?.navLabel ?? "",
          } as ResolvedTocEntry;
        })
        .filter(
          (entry: ResolvedTocEntry | null): entry is ResolvedTocEntry =>
            entry !== null
        );
    }

    const navEntry = manifestIndex.navEntries.find(
      (candidate) => candidate.href && candidate.id
    );

    if (!navEntry || !navEntry.id) {
      return [];
    }

    try {
      const navContent: string = await new Promise((resolve, reject) => {
        epub.getChapterRaw(navEntry.id, (error: unknown, xhtml: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(typeof xhtml === "string" ? xhtml : String(xhtml ?? ""));
        });
      });

      return this.parseNavDocument(navContent, navEntry.href, manifestIndex);
    } catch (error) {
      console.warn("解析 EPUB 导航文档失败:", error);
      return [];
    }
  }

  private buildFallbackSpineEntries(
    epub: any,
    manifestIndex: ManifestIndex
  ): ResolvedTocEntry[] {
    const flowItems = Array.isArray(epub?.flow) ? epub.flow : [];
    const spineItems = Array.isArray(epub?.spine?.contents)
      ? epub.spine.contents
      : [];
    const baseItems =
      flowItems.length > 0
        ? flowItems
        : spineItems.length > 0
        ? spineItems
        : [];

    const seen = new Set<string>();
    const entries: ResolvedTocEntry[] = [];

    baseItems.forEach((item: any) => {
      const manifestId =
        item?.id ||
        item?.idref ||
        (typeof item?.href === "string"
          ? manifestIndex.hrefToId.get(this.normalizeZipPath(item.href))
          : undefined);

      if (!manifestId || seen.has(manifestId)) {
        return;
      }

      seen.add(manifestId);
      const manifestItem = manifestIndex.byId.get(manifestId) ?? {};
      const href =
        typeof manifestItem.href === "string"
          ? manifestItem.href
          : item?.href ??
            (typeof item?.href === "string"
              ? this.normalizeZipPath(item.href)
              : undefined);

      entries.push({
        manifestId,
        href,
        title: item?.title,
      });
    });

    return entries;
  }

  private parseNavDocument(
    navContent: string,
    navHref: string,
    manifestIndex: ManifestIndex
  ): ResolvedTocEntry[] {
    const navMatch = navContent.match(
      /<nav[^>]*epub:type=["']toc["'][^>]*>([\s\S]*?)<\/nav>/i
    );
    if (!navMatch) {
      return [];
    }

    const navSection = navMatch[1];
    const navBaseDir = path.posix.dirname(navHref);
    const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    const entries: ResolvedTocEntry[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(navSection)) !== null) {
      const rawHref = match[1];
      const resolved = this.resolveNavHref(navBaseDir, navHref, rawHref);
      if (!resolved) {
        continue;
      }

      const manifestId = manifestIndex.hrefToId.get(resolved.path);
      if (!manifestId || seen.has(manifestId)) {
        continue;
      }

      seen.add(manifestId);
      const manifestItem = manifestIndex.byId.get(manifestId) ?? {};
      const baseHref =
        typeof manifestItem.href === "string"
          ? manifestItem.href
          : resolved.path;
      const finalHref =
        resolved.fragment && !baseHref.includes("#")
          ? `${baseHref}#${resolved.fragment}`
          : baseHref;

      const title = match[2]
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      entries.push({
        manifestId,
        href: finalHref,
        title,
      });
    }

    return entries;
  }

  private resolveNavHref(
    navBaseDir: string,
    navHref: string,
    rawHref: string
  ): { path: string; fragment?: string } | null {
    if (typeof rawHref !== "string") {
      return null;
    }

    const [hrefPathPart, fragmentPart] = rawHref.split("#");
    const trimmedPath = hrefPathPart?.trim() ?? "";
    const normalizedPath = trimmedPath.length
      ? this.normalizeZipPath(
          path.posix.normalize(
            trimmedPath.startsWith("/")
              ? trimmedPath.slice(1)
              : navBaseDir && navBaseDir !== "."
              ? `${navBaseDir}/${trimmedPath}`
              : trimmedPath
          )
        )
      : this.normalizeZipPath(navHref);

    const fragment = fragmentPart?.trim();

    return {
      path: normalizedPath,
      fragment: fragment && fragment.length > 0 ? fragment : undefined,
    };
  }

  private normalizeZipPath(value: string): string {
    return value
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\/{2,}/g, "/");
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
