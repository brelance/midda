import React, { forwardRef, useMemo } from "react";
import DOMPurify from "dompurify";
import { ReadingMode, ScrollMode } from "../../types/reader";
import ReaderContentPaged, {
  type ReaderContentPagedHandle,
} from "./ReaderContentPaged";
import StudyDoublePanel from "./StudyDoublePanel";
import type { ReaderSentenceAnalysisItem } from "./StudyDoublePanel";

interface ReaderContentProps {
  chapterTitle: string;
  contentHtml: string;
  cssContent?: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  readingMode: ReadingMode;
  scrollMode?: ScrollMode;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onPageChange?: (page: number, total: number, progress: number) => void;
  /** Used in study-double mode: annotated sentences for the right column */
  studyPanelSentences?: ReaderSentenceAnalysisItem[];
  bookId?: string;
  enableTokenHoverTts?: boolean;
  ttsLanguage?: string;
}

/**
 * Allowed HTML tags for EPUB chapter content.
 * We preserve all typographic and layout elements while blocking
 * any executable content that could abuse window.api via IPC.
 */
const EPUB_ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "span", "em", "strong", "b", "i", "u", "s", "del", "ins", "mark",
  "sup", "sub", "small", "abbr", "cite", "q", "dfn", "code", "kbd",
  "pre", "samp", "var",
  "a",
  "img",
  "figure", "figcaption",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "blockquote",
  "div", "section", "article", "aside", "main", "header", "footer", "nav",
  "ruby", "rt", "rp", "rb",
  "svg", "path", "circle", "rect", "line", "polyline", "polygon", "text",
  "g", "defs", "use", "symbol", "clipPath", "mask",
];

const EPUB_ALLOWED_ATTR = [
  "src", "alt", "title", "href", "target", "rel",
  "class", "id", "lang", "dir",
  "width", "height", "style",
  "colspan", "rowspan", "scope",
  "epub:type", "role", "aria-label", "aria-hidden",
  // SVG attributes
  "viewBox", "xmlns", "fill", "stroke", "stroke-width", "d",
  "x", "y", "x1", "y1", "x2", "y2", "r", "rx", "ry", "cx", "cy",
  "transform", "clip-path",
];

const sanitizeEpubHtml = (html: string): string => {
  if (typeof window === "undefined" || !html) return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: EPUB_ALLOWED_TAGS,
    ALLOWED_ATTR: EPUB_ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "object", "embed", "form", "input", "textarea", "button", "select"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onblur",
                  "onkeydown", "onkeyup", "onchange", "onsubmit", "onreset",
                  "srcdoc", "data"],
    // Keep epub-img:// protocol URLs for our custom image protocol handler
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|epub-img):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORCE_BODY: false,
    RETURN_DOM: false,
  });
};

/**
 * Scope EPUB CSS rules so they only apply inside .epub-content wrappers,
 * preventing EPUB styles from bleeding into the application UI.
 *
 * Rules:
 * - `body`, `html`, `:root` → `.epub-content`
 * - `@font-face` → kept as-is (font declarations are inherently global)
 * - `@keyframes` → kept as-is
 * - `@media` wrapper → preserved, inner selectors are prefixed
 * - Everything else → `.epub-content <selector>`
 */
function scopeEpubCss(css: string, scope: string): string {
  if (!css || !css.trim()) return "";

  // Remove @charset (must be at very top of stylesheet, breaks <style> injection)
  const cleaned = css.replace(/@charset\s+["'][^"']*["']\s*;/gi, "");

  const result: string[] = [];
  let i = 0;
  const len = cleaned.length;

  while (i < len) {
    // Skip whitespace
    if (/\s/.test(cleaned[i])) {
      result.push(cleaned[i]);
      i++;
      continue;
    }

    // Comments
    if (cleaned.startsWith("/*", i)) {
      const end = cleaned.indexOf("*/", i + 2);
      if (end === -1) {
        result.push(cleaned.slice(i));
        break;
      }
      result.push(cleaned.slice(i, end + 2));
      i = end + 2;
      continue;
    }

    // At-rules
    if (cleaned[i] === "@") {
      const atKeywordMatch = cleaned.slice(i).match(/^@([\w-]+)/);
      const atKeyword = atKeywordMatch ? atKeywordMatch[1].toLowerCase() : "";

      // Block at-rules with nested rules: @media, @supports, @document
      if (["media", "supports", "document", "layer"].includes(atKeyword)) {
        const blockStart = cleaned.indexOf("{", i);
        if (blockStart === -1) {
          result.push(cleaned.slice(i));
          break;
        }
        // Find matching closing brace
        let depth = 1;
        let j = blockStart + 1;
        while (j < len && depth > 0) {
          if (cleaned[j] === "{") depth++;
          else if (cleaned[j] === "}") depth--;
          j++;
        }
        const prelude = cleaned.slice(i, blockStart + 1);
        const inner = cleaned.slice(blockStart + 1, j - 1);
        result.push(prelude);
        result.push(scopeEpubCss(inner, scope)); // recurse for inner rules
        result.push("}");
        i = j;
        continue;
      }

      // Non-block at-rules: @font-face, @keyframes, @import, @charset, @namespace
      // Find end of this rule (next ; or { ... })
      const nextBrace = cleaned.indexOf("{", i);
      const nextSemi = cleaned.indexOf(";", i);

      if (nextBrace !== -1 && (nextSemi === -1 || nextBrace < nextSemi)) {
        // Block at-rule without inner rules (@font-face, @keyframes)
        let depth = 1;
        let j = nextBrace + 1;
        while (j < len && depth > 0) {
          if (cleaned[j] === "{") depth++;
          else if (cleaned[j] === "}") depth--;
          j++;
        }
        result.push(cleaned.slice(i, j)); // keep verbatim
        i = j;
      } else if (nextSemi !== -1) {
        result.push(cleaned.slice(i, nextSemi + 1));
        i = nextSemi + 1;
      } else {
        result.push(cleaned.slice(i));
        break;
      }
      continue;
    }

    // Regular CSS rule: find selector(s) + {declarations}
    const braceStart = cleaned.indexOf("{", i);
    if (braceStart === -1) {
      // Trailing content with no block – ignore
      break;
    }

    const rawSelectors = cleaned.slice(i, braceStart).trim();

    // Find the matching closing brace
    let depth = 1;
    let j = braceStart + 1;
    while (j < len && depth > 0) {
      if (cleaned[j] === "{") depth++;
      else if (cleaned[j] === "}") depth--;
      j++;
    }

    const declarations = cleaned.slice(braceStart + 1, j - 1);

    // Prefix each comma-separated selector
    const prefixed = rawSelectors
      .split(",")
      .map((sel) => {
        const trimmed = sel.trim();
        if (!trimmed) return "";
        // Map global selectors to the scope class itself
        if (/^(html|body|:root)$/i.test(trimmed)) {
          return `.${scope}`;
        }
        // Already scoped - don't double-scope
        if (trimmed.startsWith(`.${scope}`)) {
          return trimmed;
        }
        return `.${scope} ${trimmed}`;
      })
      .filter(Boolean)
      .join(", ");

    if (prefixed) {
      result.push(`${prefixed} {${declarations}}`);
    }

    i = j;
  }

  return result.join("");
}

const EPUB_CSS_SCOPE = "epub-content";

// The ref can be either a plain div (scroll mode) or the paged handle
export type ReaderContentHandle = HTMLDivElement | ReaderContentPagedHandle;

const ReaderContent = forwardRef<ReaderContentHandle, ReaderContentProps>(
  (
    {
      chapterTitle,
      contentHtml,
      cssContent,
      onScroll,
      readingMode,
      scrollMode = "scroll",
      onNextChapter,
      onPrevChapter,
      onPageChange,
      studyPanelSentences,
      bookId,
      enableTokenHoverTts,
      ttsLanguage,
    },
    ref
  ) => {
    const safeHtml = useMemo(() => sanitizeEpubHtml(contentHtml), [contentHtml]);
    const scopedCss = useMemo(
      () => (cssContent ? scopeEpubCss(cssContent, EPUB_CSS_SCOPE) : ""),
      [cssContent]
    );

    // ── Study double-page mode ─────────────────────────────────────────
    if (readingMode === "study-double") {
      return (
        <StudyDoublePanel
          chapterTitle={chapterTitle}
          contentHtml={safeHtml}
          scopedCss={scopedCss || undefined}
          sentences={studyPanelSentences ?? []}
          bookId={bookId ?? ""}
          enableTokenHoverTts={enableTokenHoverTts}
          ttsLanguage={ttsLanguage}
          onScroll={onScroll}
        />
      );
    }

    // ── Page mode ──────────────────────────────────────────────────────
    if (scrollMode === "page") {
      return (
        <ReaderContentPaged
          ref={ref as React.Ref<ReaderContentPagedHandle>}
          chapterTitle={chapterTitle}
          contentHtml={safeHtml}
          cssContent={scopedCss || undefined}
          readingMode={readingMode}
          onNextChapter={onNextChapter ?? (() => {})}
          onPrevChapter={onPrevChapter ?? (() => {})}
          onPageChange={onPageChange}
        />
      );
    }

    // ── Scroll mode (default) ──────────────────────────────────────────
    // In scroll mode, always use single-column layout.
    // Double-page (columns-2) only applies in page-turn mode.
    const containerMaxWidth = "max-w-[780px]";

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        onScroll={onScroll}
        className={`reading-content no-scrollbar mx-auto h-full ${containerMaxWidth} overflow-y-auto px-2 md:px-4`}
        style={{
          fontSize: "var(--reader-font-size, 18px)",
          lineHeight: "var(--reader-line-height, 1.8)",
          color: "var(--reader-text, #1d1d1f)",
        }}
      >
        {scopedCss && (
          // eslint-disable-next-line react/no-danger
          <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
        )}
        <div className={`${EPUB_CSS_SCOPE}`}>
          <h1 className="mb-6 text-4xl font-black">{chapterTitle}</h1>
          <div
            className="space-y-6 font-normal"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </div>
      </div>
    );
  }
);

ReaderContent.displayName = "ReaderContent";

export default ReaderContent;
