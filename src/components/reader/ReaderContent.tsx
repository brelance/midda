import React, { forwardRef, useMemo } from "react";
import DOMPurify from "dompurify";
import { ReadingMode } from "../../types/reader";

interface ReaderContentProps {
  chapterTitle: string;
  contentHtml: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  readingMode: ReadingMode;
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

const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ chapterTitle, contentHtml, onScroll, readingMode }, ref) => {
    const containerMaxWidth =
      readingMode === "double" ? "max-w-[1100px]" : "max-w-[780px]";
    const modeClass =
      readingMode === "double"
        ? "double-page-mode md:columns-2 md:gap-12"
        : "";

    const safeHtml = useMemo(() => sanitizeEpubHtml(contentHtml), [contentHtml]);

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={`reading-content no-scrollbar mx-auto h-full ${containerMaxWidth} overflow-y-auto px-2 text-lg leading-8 text-[#3d2b1f] md:px-4 md:text-xl`}
      >
        <h1 className="mb-6 text-4xl font-black">{chapterTitle}</h1>
        <div
          className={`space-y-6 font-normal ${modeClass}`}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    );
  }
);

ReaderContent.displayName = "ReaderContent";

export default ReaderContent;
