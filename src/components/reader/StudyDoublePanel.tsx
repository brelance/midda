import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
export interface ReaderSentenceAnalysisItem {
  id: string;
  text: string;
  chapterId: string;
  paragraphIndex: number;
  sentenceIndex: number;
  status: "idle" | "loading" | "loaded" | "error";
  tokens?: import("../../types/types").TokenData[];
  error?: string;
}
import type { TokenData } from "../../types/types";
import {
  containsKanji,
  posChineseMap,
  speakJapanese,
} from "../../utils/helper";

interface StudyDoublePanelProps {
  chapterTitle: string;
  /** Kept for API compatibility — no longer rendered directly */
  contentHtml: string;
  /** Already-scoped EPUB CSS string (may be empty) */
  scopedCss?: string;
  sentences: ReaderSentenceAnalysisItem[];
  bookId: string;
  enableTokenHoverTts?: boolean;
  ttsLanguage?: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

// ── POS colour map ──────────────────────────────────────────────────────────
const POS_COLOR: Record<string, string> = {
  動詞: "#2C6BE0",
  形容詞: "#B45309",
  形状詞: "#B45309",
  助詞: "#9B9B9B",
  助動詞: "#9B9B9B",
  副詞: "#6D5A9B",
  接続詞: "#6D5A9B",
};

function getPosColor(pos: string): string {
  const base = pos.split("-")[0];
  return POS_COLOR[base] ?? "var(--reader-text, #1C1C1E)";
}

// ── Token popover state ─────────────────────────────────────────────────────
interface TokenPopoverState {
  visible: boolean;
  x: number;
  y: number;
  word: string;
  reading: string;
  pos: string;
  romaji: string;
  baseForm: string;
  meaning: string;
  loading: boolean;
}

const INITIAL_POPOVER: TokenPopoverState = {
  visible: false,
  x: 0,
  y: 0,
  word: "",
  reading: "",
  pos: "",
  romaji: "",
  baseForm: "",
  meaning: "",
  loading: false,
};

// ── StudyToken ──────────────────────────────────────────────────────────────
interface StudyTokenProps {
  token: TokenData;
  sentenceText: string;
  onTokenClick: (
    e: React.MouseEvent<HTMLSpanElement>,
    token: TokenData,
    sentenceText: string
  ) => void;
  enableHoverTts: boolean;
  ttsLanguage?: string;
}

const StudyToken: React.FC<StudyTokenProps> = ({
  token,
  sentenceText,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
}) => {
  const color = getPosColor(token.pos);
  const showRuby =
    !!token.furigana &&
    token.furigana !== token.word &&
    containsKanji(token.word) &&
    token.pos !== "記号";
  const showRomaji = !!token.romaji && token.pos !== "記号";

  const handleMouseEnter = useCallback(() => {
    if (!enableHoverTts) return;
    const lang = ttsLanguage && ttsLanguage !== "system" ? ttsLanguage : "ja-JP";
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(token.word);
    utt.lang = lang;
    utt.rate = 0.9;
    window.speechSynthesis?.speak(utt);
  }, [enableHoverTts, ttsLanguage, token.word]);

  return (
    <span
      className="study-word-unit"
      style={{ "--word-color": color } as React.CSSProperties}
      onClick={(e) => onTokenClick(e, token, sentenceText)}
      onMouseEnter={handleMouseEnter}
    >
      <span className="study-ruby">
        {showRuby ? token.furigana : "\u00A0"}
      </span>
      <span className="study-kanji" style={{ color }}>
        {token.word}
      </span>
      {showRomaji && (
        <span className="study-romaji">{token.romaji}</span>
      )}
    </span>
  );
};

// ── StudySentenceRow ────────────────────────────────────────────────────────
interface StudySentenceRowProps {
  item: ReaderSentenceAnalysisItem;
  onTokenClick: (
    e: React.MouseEvent<HTMLSpanElement>,
    token: TokenData,
    sentenceText: string
  ) => void;
  enableHoverTts: boolean;
  ttsLanguage?: string;
}

const StudySentenceRow: React.FC<StudySentenceRowProps> = ({
  item,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
}) => {
  if (item.status === "loading") {
    return (
      <div className="study-sentence-row study-loading">
        <span className="study-loading-dots">···</span>
      </div>
    );
  }

  if (item.status === "error") {
    return (
      <div className="study-sentence-row study-error-row">
        <span title={item.error ?? "分析失败"}>⚠ {item.text}</span>
      </div>
    );
  }

  if (item.status === "loaded" && item.tokens && item.tokens.length > 0) {
    return (
      <div className="study-sentence-row">
        {item.tokens.map((token, idx) => (
          <StudyToken
            key={idx}
            token={token}
            sentenceText={item.text}
            onTokenClick={onTokenClick}
            enableHoverTts={enableHoverTts}
            ttsLanguage={ttsLanguage}
          />
        ))}
      </div>
    );
  }

  // idle or loaded with no tokens — show plain text
  return (
    <div className="study-sentence-row study-idle-row">
      <span style={{ color: "var(--reader-text, #1C1C1E)", opacity: 0.45 }}>
        {item.text}
      </span>
    </div>
  );
};

// ── StudyPopover ────────────────────────────────────────────────────────────
interface StudyPopoverProps {
  state: TokenPopoverState;
  onClose: () => void;
}

const StudyPopover: React.FC<StudyPopoverProps> = ({ state, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const basePos = state.pos.split("-")[0];
  const posZh = posChineseMap[basePos] ?? posChineseMap["default"];
  const posColorMap: Record<string, string> = {
    動詞: "rgba(44,107,224,0.45)",
    形容詞: "rgba(180,83,9,0.45)",
    形状詞: "rgba(180,83,9,0.45)",
    助詞: "rgba(155,155,155,0.25)",
    助動詞: "rgba(155,155,155,0.25)",
  };
  const tagBg = posColorMap[basePos] ?? "rgba(255,255,255,0.12)";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (state.visible) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  return (
    <div
      ref={ref}
      className="study-popover"
      style={{ left: state.x, top: state.y }}
    >
      {state.loading ? (
        <div className="study-popover-loading">查询中…</div>
      ) : (
        <>
          <div className="study-popover-word">{state.word}</div>
          <div className="study-popover-reading">
            {state.reading}
            {state.romaji ? `　${state.romaji}` : ""}
          </div>
          {state.baseForm && (
            <div className="study-popover-baseform">
              原形：{state.baseForm}
            </div>
          )}
          <div className="study-popover-divider" />
          <div className="study-popover-row">
            <span className="study-popover-tag" style={{ background: tagBg }}>
              {state.pos} · {posZh}
            </span>
            {state.word && (
              <button
                className="study-popover-speak"
                onClick={() => speakJapanese(state.word)}
                title="朗读"
              >
                ♪
              </button>
            )}
          </div>
          {state.meaning && (
            <div className="study-popover-meaning">{state.meaning}</div>
          )}
        </>
      )}
    </div>
  );
};

// ── ParagraphGroup ──────────────────────────────────────────────────────────
/**
 * Renders one paragraph as three adjacent grid cells:
 *   [left plain text] | [1px divider] | [right sentence analysis rows]
 *
 * Because all three cells share the same implicit grid row, CSS Grid
 * automatically stretches the shorter cell to match the taller one —
 * giving pixel-perfect left↔right alignment with zero JS height measurement.
 */
interface ParagraphGroupProps {
  items: ReaderSentenceAnalysisItem[];
  onTokenClick: (
    e: React.MouseEvent<HTMLSpanElement>,
    token: TokenData,
    sentenceText: string
  ) => void;
  enableHoverTts: boolean;
  ttsLanguage?: string;
}

const ParagraphGroup: React.FC<ParagraphGroupProps> = ({
  items,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
}) => {
  const plainText = items.map((s) => s.text).join("");

  return (
    <>
      {/* Left cell: plain paragraph text */}
      <div
        style={{
          padding: "0 2rem 0 0",
          fontSize: "var(--reader-font-size, 18px)",
          lineHeight: "var(--reader-line-height, 1.8)",
          color: "var(--reader-text, #1d1d1f)",
          fontFamily: "-apple-system, 'SF Pro Text', 'Hiragino Mincho ProN', serif",
          letterSpacing: "0.02em",
          wordBreak: "break-all",
        }}
      >
        {plainText}
      </div>

      {/* Center: the vertical divider */}
      <div
        style={{
          alignSelf: "stretch",
          width: 1,
          backgroundColor: "rgba(0,0,0,0.06)",
        }}
      />

      {/* Right cell: sentence analysis rows */}
      <div
        style={{
          padding: "0 0 0 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
        }}
      >
        {items.map((item) => (
          <StudySentenceRow
            key={item.id}
            item={item}
            onTokenClick={onTokenClick}
            enableHoverTts={enableHoverTts}
            ttsLanguage={ttsLanguage}
          />
        ))}
      </div>
    </>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
const StudyDoublePanel: React.FC<StudyDoublePanelProps> = ({
  chapterTitle,
  scopedCss,
  sentences,
  bookId,
  enableTokenHoverTts = false,
  ttsLanguage,
  onScroll,
}) => {
  const [popover, setPopover] = useState<TokenPopoverState>(INITIAL_POPOVER);

  // Group sentences by paragraphIndex, keeping document order
  const paragraphGroups = useMemo(() => {
    const map = new Map<number, ReaderSentenceAnalysisItem[]>();
    for (const s of sentences) {
      const group = map.get(s.paragraphIndex) ?? [];
      group.push(s);
      map.set(s.paragraphIndex, group);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [sentences]);

  const handleTokenClick = useCallback(
    async (
      e: React.MouseEvent<HTMLSpanElement>,
      token: TokenData,
      sentenceText: string
    ) => {
      e.stopPropagation();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pw = 260;
      let x = rect.left + rect.width / 2 - pw / 2;
      x = Math.max(8, Math.min(x, window.innerWidth - pw - 8));
      const yAbove = rect.top - 180;
      const y = yAbove < 80 ? rect.bottom + 8 : yAbove;

      setPopover({
        visible: true,
        x,
        y,
        word: token.word,
        reading: token.furigana ?? "",
        pos: token.pos,
        romaji: token.romaji ?? "",
        baseForm: token.baseForm && token.baseForm !== token.word ? token.baseForm : "",
        meaning: "",
        loading: true,
      });

      try {
        const detail = await window.api.wordDetail.sendWordDetailRequest(
          token.word,
          token.pos,
          sentenceText,
          token.furigana ?? "",
          token.romaji ?? ""
        );
        setPopover((prev) => ({
          ...prev,
          loading: false,
          meaning: detail?.chineseTranslation
            ? `${detail.chineseTranslation}${detail.explanation ? `\n${detail.explanation}` : ""}`
            : "",
        }));
      } catch {
        setPopover((prev) => ({
          ...prev,
          loading: false,
          meaning: "查询释义时出错",
        }));
      }
    },
    [bookId]
  );

  const closePopover = useCallback(() => setPopover(INITIAL_POPOVER), []);

  const sentencesLoaded = useMemo(
    () =>
      sentences.filter(
        (s) => s.status === "loaded" && s.tokens && s.tokens.length > 0
      ).length,
    [sentences]
  );
  const sentencesTotal = sentences.length;

  return (
    <div
      className="study-double-panel no-scrollbar"
      onScroll={onScroll}
    >
      {scopedCss && (
        // eslint-disable-next-line react/no-danger
        <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      )}

      {/*
        3-column CSS Grid: [left content] [1px divider] [right analysis]
        Each paragraph group renders three adjacent cells in the same implicit
        grid row, so the browser stretches both content cells to the taller
        one — achieving left↔right alignment automatically.
      */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          alignItems: "start",
          rowGap: "0.75rem",
        }}
      >
        {/* ── Title row ── */}
        <h1
          style={{
            padding: "0 2rem 0 0",
            fontSize: "2rem",
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            color: "var(--reader-text, #1d1d1f)",
            fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
          }}
        >
          {chapterTitle}
        </h1>
        <div style={{ alignSelf: "stretch", width: 1, backgroundColor: "rgba(0,0,0,0.06)" }} />
        <h1
          style={{
            padding: "0 0 0 2rem",
            fontSize: "2rem",
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            color: "var(--reader-text, #1d1d1f)",
            opacity: 0.25,
            fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
          }}
        >
          {chapterTitle}
        </h1>

        {/* ── Paragraph rows ── */}
        {paragraphGroups.length === 0 ? (
          <>
            <div
              style={{
                padding: "2rem 1.5rem 2rem 0",
                textAlign: "center",
                opacity: 0.4,
                fontSize: "var(--reader-font-size, 18px)",
              }}
            >
              当前章节暂无可分析的句子。
            </div>
            <div />
            <div />
          </>
        ) : (
          paragraphGroups.map(([paragraphIndex, items]) => (
            <ParagraphGroup
              key={paragraphIndex}
              items={items}
              onTokenClick={handleTokenClick}
              enableHoverTts={enableTokenHoverTts}
              ttsLanguage={ttsLanguage}
            />
          ))
        )}
      </div>

      {/* Analysis progress badge */}
      {sentencesTotal > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "1.25rem",
            right: "1.5rem",
            zIndex: 200,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: "#fff",
            fontSize: "0.72rem",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
            padding: "0.25rem 0.65rem",
            borderRadius: "999px",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {sentencesLoaded}/{sentencesTotal} 句已分析
        </div>
      )}

      <StudyPopover state={popover} onClose={closePopover} />
    </div>
  );
};

export default StudyDoublePanel;
