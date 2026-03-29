import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  lookupDict,
  formatDictResult,
  lookupExamples,
  type DictDisplayData,
} from "../../services/localDictService";
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
import { useReaderSettings } from "../../stores/readerSettingsStore";
import { useTtsStore } from "../../stores/ttsStore";

interface StudyDoublePanelProps {
  chapterTitle: string;
  /** Kept for API compatibility — no longer rendered directly */
  contentHtml: string;
  /** Already-scoped EPUB CSS string (may be empty) */
  scopedCss?: string;
  sentences: ReaderSentenceAnalysisItem[];
  bookId: string;
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
export interface TokenPopoverState {
  visible: boolean;
  x: number;
  y: number;
  word: string;
  reading: string;
  pos: string;
  romaji: string;
  baseForm: string;
  // Local dict data
  dictLoading: boolean;
  dictData: DictDisplayData | null;
  // Example sentences
  examples: import("../../types/localDict").DictExample[];
  examplesLoading: boolean;
  // AI (LLM) data — loaded on demand
  aiMeaning: string;
  aiLoading: boolean;
}

export const INITIAL_POPOVER: TokenPopoverState = {
  visible: false,
  x: 0,
  y: 0,
  word: "",
  reading: "",
  pos: "",
  romaji: "",
  baseForm: "",
  dictLoading: false,
  dictData: null,
  examples: [],
  examplesLoading: false,
  aiMeaning: "",
  aiLoading: false,
};

function renderTokenWord(word: string): React.ReactNode {
  const lines = word.split("\n");
  return lines.map((line, idx) => (
    <React.Fragment key={idx}>
      {line}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

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
  vocabSet?: Set<string>;
}

export const StudyToken: React.FC<StudyTokenProps> = ({
  token,
  sentenceText,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
  vocabSet,
}) => {
  const color = getPosColor(token.pos);
  const isSeen = vocabSet?.has(token.baseForm || token.word);
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
      data-vocab={isSeen ? "seen" : undefined}
    >
      <span className="study-ruby">
        {showRuby ? token.furigana : "\u00A0"}
      </span>
      <span className="study-kanji" style={{ color }}>
        {renderTokenWord(token.word)}
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
    sentenceText: string,
    chapterId: string
  ) => void;
  enableHoverTts: boolean;
  ttsLanguage?: string;
  vocabSet?: Set<string>;
}

export const StudySentenceRow: React.FC<StudySentenceRowProps> = ({
  item,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
  vocabSet,
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
            onTokenClick={(e, tok, text) =>
              onTokenClick(e, tok, text, item.chapterId)
            }
            enableHoverTts={enableHoverTts}
            ttsLanguage={ttsLanguage}
            vocabSet={vocabSet}
          />
        ))}
      </div>
    );
  }

  // idle or loaded with no tokens — show plain text
  return (
    <div className="study-sentence-row study-idle-row">
      <span style={{ color: "var(--reader-text, #1C1C1E)", opacity: 0.45 }}>
        {item.text.split("\n").map((line, i, arr) => (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

// ── StudyPopover ────────────────────────────────────────────────────────────
interface StudyPopoverProps {
  state: TokenPopoverState;
  sentenceText: string;
  onClose: () => void;
  onRequestAi: () => void;
}

export const StudyPopover: React.FC<StudyPopoverProps> = ({
  state,
  onClose,
  onRequestAi,
}) => {
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
  const dict = state.dictData;

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
      {state.dictLoading ? (
        <div className="study-popover-loading">查询中…</div>
      ) : (
        <>
          {/* ── Header: surface word + TTS + AI ── */}
          <div className="study-popover-header">
            <div className="study-popover-word">{state.word}</div>
            <div className="study-popover-actions">
              {state.word && (
                <button
                  className="study-popover-speak"
                  onClick={() => speakJapanese(state.word)}
                  title="朗读"
                >
                  ♪
                </button>
              )}
              <button
                className={`study-popover-ai-btn${
                  state.aiLoading ? " loading" : ""
                }${state.aiMeaning ? " done" : ""}`}
                onClick={onRequestAi}
                disabled={state.aiLoading || !!state.aiMeaning}
                title="AI 释义"
              >
                AI
              </button>
            </div>
          </div>

          {/* ── Reading + romaji (always from surface token) ── */}
          <div className="study-popover-reading">
            {state.reading}
            {state.romaji ? `　${state.romaji}` : ""}
          </div>

          {/* ── Base form + dict headword ── */}
          {state.baseForm && (
            <div className="study-popover-baseform">
              原形：{state.baseForm}
              {dict?.found && dict.headword !== state.baseForm && (
                <span>（{dict.headword}）</span>
              )}
            </div>
          )}

          <div className="study-popover-divider" />

          {/* ── POS tag row ── */}
          <div className="study-popover-row">
            <span className="study-popover-tag" style={{ background: tagBg }}>
              {state.pos} · {posZh}
            </span>
            {dict?.found && dict.pos.length > 0 && (
              <span className="study-popover-tag-en">
                {dict.pos.slice(0, 2).join(", ")}
              </span>
            )}
          </div>

          {/* ── JMdict glosses ── */}
          {dict?.found && dict.glosses.length > 0 && (
            <div className="study-popover-glosses">
              {dict.glosses.slice(0, 5).map((g, i) => (
                <div key={i} className="study-popover-gloss-item">
                  <span className="study-popover-gloss-num">{i + 1}.</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── No dict result hint ── */}
          {dict && !dict.found && !state.aiMeaning && (
            <div className="study-popover-no-dict">
              本地词典无结果，点击 AI 按钮查询
            </div>
          )}

          {/* ── Example sentences ── */}
          {state.examplesLoading && (
            <>
              <div className="study-popover-divider" />
              <div className="study-popover-examples-section">
                <span className="study-popover-examples-label">例句</span>
                <span className="study-popover-loading">查询中…</span>
              </div>
            </>
          )}
          {state.examples.length > 0 && (
            <>
              <div className="study-popover-divider" />
              <div className="study-popover-examples-section">
                <span className="study-popover-examples-label">例句</span>
              </div>
              <div className="study-popover-examples">
                {state.examples.slice(0, 3).map((ex) => {
                  const jpn = ex.sentences.find((s) => s.lang === "jpn");
                  const eng = ex.sentences.find((s) => s.lang === "eng");
                  if (!jpn) return null;
                  return (
                    <div key={ex.id} className="study-popover-example-item">
                      <div className="study-popover-example-jpn">{jpn.text}</div>
                      {eng && (
                        <div className="study-popover-example-eng">{eng.text}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── AI meaning (on demand) ── */}
          {state.aiLoading && (
            <>
              <div className="study-popover-divider" />
              <div className="study-popover-ai-section">
                <span className="study-popover-ai-label">AI</span>
                <span className="study-popover-loading">查询中…</span>
              </div>
            </>
          )}
          {state.aiMeaning && (
            <>
              <div className="study-popover-divider" />
              <div className="study-popover-ai-section">
                <span className="study-popover-ai-label">AI</span>
              </div>
              <div className="study-popover-meaning">{state.aiMeaning}</div>
            </>
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
    sentenceText: string,
    chapterId: string
  ) => void;
  enableHoverTts: boolean;
  ttsLanguage?: string;
  onSentenceTtsClick: (item: ReaderSentenceAnalysisItem) => void;
  playingSentenceId: string | null;
  vocabSet?: Set<string>;
}

const ParagraphGroup: React.FC<ParagraphGroupProps> = ({
  items,
  onTokenClick,
  enableHoverTts,
  ttsLanguage,
  onSentenceTtsClick,
  playingSentenceId,
  vocabSet,
}) => {
  return (
    <>
      {/* Left cell: plain paragraph text — per-sentence clickable spans */}
      <div
        style={{
          padding: "0 2rem 0 0",
          fontSize: "var(--reader-font-size, 18px)",
          lineHeight: "var(--reader-line-height, 1.8)",
          color: "var(--reader-text, #1d1d1f)",
          fontFamily: "var(--reader-font-family, inherit)",
          letterSpacing: "0.02em",
          wordBreak: "break-all",
        }}
      >
        {items.map((item) => (
          <span
            key={item.id}
            className={`study-sentence-clickable${
              playingSentenceId === item.id ? " study-sentence-playing" : ""
            }`}
            onClick={() => onSentenceTtsClick(item)}
            title="点击朗读"
          >
            {item.text}
          </span>
        ))}
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
            vocabSet={vocabSet}
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
  onScroll,
}) => {
  const { enableTokenHoverTts, analysisTtsLanguage: ttsLanguage } = useReaderSettings();
  const playingSentenceId = useTtsStore((s) => s.playingSentenceId);

  const [popover, setPopover] = useState<TokenPopoverState>(INITIAL_POPOVER);
  const [vocabSet, setVocabSet] = useState<Set<string>>(new Set());

  // ── Load vocabulary base forms for visual cue ──
  useEffect(() => {
    window.api.db.vocabulary
      .getBaseForms()
      .then((arr: string[]) => setVocabSet(new Set(arr)))
      .catch(() => {/* ignore */});
  }, [bookId]);

  // ── Click sentence to TTS ──
  const handleSentenceTts = useCallback(
    (item: ReaderSentenceAnalysisItem) => {
      if (playingSentenceId === item.id) {
        // Click again → stop
        window.api.tts.stop();
        return;
      }
      window.api.tts.start(
        [{ id: item.id, text: item.text }],
        { language: ttsLanguage ?? "ja-JP" }
      );
    },
    [playingSentenceId, ttsLanguage]
  );

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

  // Keep a ref to the current sentence text for the AI callback
  const currentSentenceRef = useRef("");

  // ── Staleness guard: each token click bumps the ID; async callbacks
  //    skip state updates if the ID no longer matches. ──
  const tokenRequestIdRef = useRef(0);

  const handleTokenClick = useCallback(
    async (
      e: React.MouseEvent<HTMLSpanElement>,
      token: TokenData,
      sentenceText: string,
      chapterId: string
    ) => {
      e.stopPropagation();
      currentSentenceRef.current = sentenceText;
      const requestId = ++tokenRequestIdRef.current;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pw = 300;
      let x = rect.left + rect.width / 2 - pw / 2;
      x = Math.max(8, Math.min(x, window.innerWidth - pw - 8));
      const yAbove = rect.top - 240;
      const y = yAbove < 80 ? rect.bottom + 8 : yAbove;

      const basePopover: TokenPopoverState = {
        visible: true,
        x,
        y,
        word: token.word,
        reading: token.furigana ?? "",
        pos: token.pos,
        romaji: token.romaji ?? "",
        baseForm:
          token.baseForm && token.baseForm !== token.word
            ? token.baseForm
            : "",
        dictLoading: true,
        dictData: null,
        examples: [],
        examplesLoading: false,
        aiMeaning: "",
        aiLoading: false,
      };

      setPopover(basePopover);

      // Phase 1: local dictionary lookup (instant)
      //
      // Strategy:
      // - If baseForm is available and differs from surface → query baseForm (reliable lemma)
      // - If baseForm == surface (already dictionary form) → query as-is
      // - If no baseForm → skip local dict (surface forms like した can be
      //   homographs of other entries, e.g. 下, leading to false positives)
      const emptyDict = { found: false, headword: "", reading: "", pos: [] as string[], glosses: [] as string[], senses: [] as import("../../types/localDict").DictSense[], allEntries: [] as import("../../types/localDict").DictEntry[] };

      try {
        const hasBaseForm = !!token.baseForm;
        const isAlreadyDictForm = !token.baseForm || token.baseForm === token.word;

        if (!hasBaseForm) {
          // No lemma info → don't risk a false-positive surface match
          if (tokenRequestIdRef.current !== requestId) return;
          setPopover((prev) => ({
            ...prev,
            dictLoading: false,
            dictData: emptyDict,
          }));
        } else {
          // Query the baseForm (reliable lemma from LLM morphological analysis)
          const dictResult = await lookupDict(token.baseForm!);
          if (tokenRequestIdRef.current !== requestId) return;
          let dictData = dictResult
            ? formatDictResult(dictResult)
            : emptyDict;

          // If baseForm lookup missed and the surface IS the dict form, try it
          if (!dictData.found && isAlreadyDictForm) {
            const surfaceResult = await lookupDict(token.word);
            if (tokenRequestIdRef.current !== requestId) return;
            dictData = surfaceResult
              ? formatDictResult(surfaceResult)
              : emptyDict;
          }

          setPopover((prev) => ({
            ...prev,
            dictLoading: false,
            dictData,
          }));

          // Load example sentences if dict found an entry
          if (dictData.found && dictData.allEntries.length > 0) {
            const bestEntryId = dictData.allEntries[0].id;
            setPopover((prev) => ({ ...prev, examplesLoading: true }));
            lookupExamples(bestEntryId, 5)
              .then((examples) => {
                if (tokenRequestIdRef.current !== requestId) return;
                setPopover((prev) => ({
                  ...prev,
                  examplesLoading: false,
                  examples: examples ?? [],
                }));
              })
              .catch(() => {
                if (tokenRequestIdRef.current !== requestId) return;
                setPopover((prev) => ({
                  ...prev,
                  examplesLoading: false,
                }));
              });
          }
        }
      } catch {
        setPopover((prev) => ({
          ...prev,
          dictLoading: false,
          dictData: emptyDict,
        }));
      }

      // ── Auto-save to vocabulary (silent, non-blocking) ──────────────────
      if (token.pos !== "記号") {
        const bf = token.baseForm || token.word;
        void window.api.db.vocabulary.upsert({
          word: token.word,
          baseForm: bf,
          hasLemma: !!token.baseForm,
          reading: token.furigana,
          romaji: token.romaji,
          pos: token.pos,
          sourceBookId: bookId,
          sentenceText,
          sentenceBookId: bookId,
          sentenceChapterId: chapterId,
        });
        // Update local set so visual cue appears immediately
        setVocabSet((prev) => {
          if (prev.has(bf)) return prev;
          const next = new Set(prev);
          next.add(bf);
          return next;
        });
      }
    },
    [bookId]
  );

  // Keep popover state in a ref so handleRequestAi always reads latest values
  const popoverRef = useRef(popover);
  popoverRef.current = popover;

  // Phase 2: AI lookup — triggered by user clicking the AI button
  const handleRequestAi = useCallback(async () => {
    setPopover((prev) => {
      if (prev.aiLoading || prev.aiMeaning) return prev;
      return { ...prev, aiLoading: true };
    });

    try {
      const p = popoverRef.current;
      const detail = await window.api.wordDetail.sendWordDetailRequest(
        p.word,
        p.pos,
        currentSentenceRef.current,
        p.reading,
        p.romaji
      );
      setPopover((prev) => ({
        ...prev,
        aiLoading: false,
        aiMeaning: detail?.chineseTranslation
          ? `${detail.chineseTranslation}${
              detail.explanation ? `\n${detail.explanation}` : ""
            }`
          : "无释义",
      }));
    } catch {
      setPopover((prev) => ({
        ...prev,
        aiLoading: false,
        aiMeaning: "AI 查询失败",
      }));
    }
  }, []);

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
            fontSize: "1.4rem",
            fontWeight: 600,
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
            fontSize: "1.4rem",
            fontWeight: 600,
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
              onSentenceTtsClick={handleSentenceTts}
              playingSentenceId={playingSentenceId}
              vocabSet={vocabSet}
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

      <StudyPopover
        state={popover}
        sentenceText={currentSentenceRef.current}
        onClose={closePopover}
        onRequestAi={handleRequestAi}
      />
    </div>
  );
};

export default StudyDoublePanel;
