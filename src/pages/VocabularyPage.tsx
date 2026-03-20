import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  VocabularyRecord,
  VocabularyContextRecord,
  VocabStatus,
} from "../types/database";
import { sm2 } from "../utils/sm2";
import { posChineseMap } from "../utils/helper";

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "review";

interface VocabWithContexts extends VocabularyRecord {
  contexts?: VocabularyContextRecord[];
  expanded?: boolean;
}

// ── Status badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<VocabStatus, { label: string; bg: string; color: string }> = {
  new: { label: "新词", bg: "rgba(59,130,246,0.10)", color: "#3b82f6" },
  learning: { label: "学习中", bg: "rgba(245,158,11,0.10)", color: "#f59e0b" },
  mastered: { label: "已掌握", bg: "rgba(34,197,94,0.10)", color: "#22c55e" },
};

const StatusBadge: React.FC<{ status: VocabStatus }> = ({ status }) => {
  const cfg = statusConfig[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
};

// ── Flashcard Component ──────────────────────────────────────────────────────

interface FlashcardProps {
  item: VocabularyRecord;
  contexts: VocabularyContextRecord[];
  onGrade: (grade: number) => void;
  currentIndex: number;
  total: number;
}

const Flashcard: React.FC<FlashcardProps> = ({
  item,
  contexts,
  onGrade,
  currentIndex,
  total,
}) => {
  const [flipped, setFlipped] = useState(false);

  // Reset flip state when card changes
  useEffect(() => {
    setFlipped(false);
  }, [item.id]);

  const basePos = item.pos?.split("-")[0] ?? "";
  const posZh = posChineseMap[basePos] ?? item.pos ?? "";

  const gradeButtons = [
    { grade: 0, label: "又忘了", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
    { grade: 2, label: "困难", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    { grade: 4, label: "记得", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
    { grade: 5, label: "简单", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      {/* Progress indicator */}
      <div
        style={{
          fontSize: 13,
          color: "rgba(0,0,0,0.35)",
          fontWeight: 500,
        }}
      >
        {currentIndex + 1} / {total}
      </div>

      {/* Card */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: 300,
          borderRadius: 16,
          backgroundColor: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          padding: "2.5rem 2rem",
          cursor: flipped ? "default" : "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          transition: "box-shadow 0.2s",
        }}
      >
        {/* Front: always visible */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#1d1d1f",
            letterSpacing: "0.02em",
          }}
        >
          {item.word}
        </div>

        {item.reading && item.reading !== item.word && (
          <div style={{ fontSize: 18, color: "rgba(0,0,0,0.4)" }}>
            {item.reading}
          </div>
        )}

        {posZh && (
          <div
            style={{
              fontSize: 12,
              color: "rgba(0,0,0,0.35)",
              padding: "2px 10px",
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.04)",
            }}
          >
            {posZh}
          </div>
        )}

        {!flipped && (
          <div
            style={{
              fontSize: 13,
              color: "rgba(0,0,0,0.25)",
              marginTop: "1rem",
            }}
          >
            点击翻牌
          </div>
        )}

        {/* Back: revealed on flip */}
        {flipped && (
          <div
            style={{
              marginTop: "1rem",
              width: "100%",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              paddingTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {item.glosses && item.glosses.length > 0 && (
              <div style={{ fontSize: 16, color: "#1d1d1f", lineHeight: 1.6 }}>
                {item.glosses.slice(0, 5).map((g, i) => (
                  <div key={i}>• {g}</div>
                ))}
              </div>
            )}

            {item.aiMeaning && (
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(0,0,0,0.5)",
                  fontStyle: "italic",
                }}
              >
                {item.aiMeaning}
              </div>
            )}

            {contexts.length > 0 && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.02)",
                  fontSize: 14,
                  color: "rgba(0,0,0,0.6)",
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.3)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  例句
                </div>
                {contexts.slice(0, 2).map((ctx) => (
                  <div key={ctx.id} style={{ marginBottom: 4 }}>
                    「{ctx.sentenceText}」
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grade buttons — visible only after flip */}
      {flipped && (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {gradeButtons.map((btn) => (
            <button
              key={btn.grade}
              onClick={() => onGrade(btn.grade)}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: `1px solid ${btn.color}22`,
                backgroundColor: btn.bg,
                color: btn.color,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = "scale(1)";
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Review Complete ──────────────────────────────────────────────────────────

const ReviewComplete: React.FC<{ reviewed: number; onBack: () => void }> = ({
  reviewed,
  onBack,
}) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1.5rem",
      color: "#1d1d1f",
    }}
  >
    <div style={{ fontSize: 48 }}>🎉</div>
    <div style={{ fontSize: 22, fontWeight: 600 }}>复习完成！</div>
    <div style={{ fontSize: 15, color: "rgba(0,0,0,0.45)" }}>
      本次复习了 {reviewed} 个词汇
    </div>
    <button
      onClick={onBack}
      style={{
        marginTop: "1rem",
        padding: "10px 28px",
        borderRadius: 12,
        backgroundColor: "#1d1d1f",
        color: "#fff",
        fontWeight: 600,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
      }}
    >
      返回列表
    </button>
  </div>
);

// ── Main VocabularyPage ──────────────────────────────────────────────────────

const VocabularyPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [vocabList, setVocabList] = useState<VocabWithContexts[]>([]);
  const [loading, setLoading] = useState(true);

  // Review state
  const [reviewQueue, setReviewQueue] = useState<VocabularyRecord[]>([]);
  const [reviewContexts, setReviewContexts] = useState<
    Record<number, VocabularyContextRecord[]>
  >({});
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Load all vocabulary
  const loadVocabulary = useCallback(async () => {
    setLoading(true);
    try {
      const all = await window.api.db.vocabulary.getAll();
      setVocabList(all.map((v) => ({ ...v, expanded: false })));
    } catch (err) {
      console.error("Failed to load vocabulary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVocabulary();
  }, [loadVocabulary]);

  // Stats
  const stats = useMemo(() => {
    const total = vocabList.length;
    const newCount = vocabList.filter((v) => v.status === "new").length;
    const learningCount = vocabList.filter((v) => v.status === "learning").length;
    const masteredCount = vocabList.filter((v) => v.status === "mastered").length;
    return { total, newCount, learningCount, masteredCount };
  }, [vocabList]);

  // Toggle expand
  const toggleExpand = useCallback(
    async (id: number) => {
      const item = vocabList.find((v) => v.id === id);
      if (!item) return;

      if (!item.expanded && !item.contexts) {
        // Lazy load contexts
        const ctxs = await window.api.db.vocabulary.getContexts(id);
        setVocabList((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, contexts: ctxs, expanded: true } : v
          )
        );
      } else {
        setVocabList((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, expanded: !v.expanded } : v
          )
        );
      }
    },
    [vocabList]
  );

  // Delete word
  const handleDelete = useCallback(async (id: number) => {
    await window.api.db.vocabulary.delete(id);
    setVocabList((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // Mark mastered
  const handleMarkMastered = useCallback(async (id: number) => {
    await window.api.db.vocabulary.updateStatus(id, "mastered");
    setVocabList((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: "mastered" as VocabStatus } : v
      )
    );
  }, []);

  // Start review
  const startReview = useCallback(async () => {
    const due = await window.api.db.vocabulary.getDue(50);
    if (due.length === 0) return;

    // Pre-load contexts for all due items
    const ctxMap: Record<number, VocabularyContextRecord[]> = {};
    await Promise.all(
      due.map(async (item) => {
        ctxMap[item.id] = await window.api.db.vocabulary.getContexts(item.id);
      })
    );

    setReviewQueue(due);
    setReviewContexts(ctxMap);
    setReviewIndex(0);
    setReviewedCount(0);
    setViewMode("review");
  }, []);

  // Handle grade
  const handleGrade = useCallback(
    async (grade: number) => {
      const current = reviewQueue[reviewIndex];
      if (!current) return;

      const result = sm2({
        grade,
        easeFactor: current.easeFactor,
        intervalDays: current.intervalDays,
        reviewCount: current.reviewCount,
      });

      const newStatus: VocabStatus =
        grade < 3 ? "learning" : result.intervalDays >= 21 ? "mastered" : "learning";

      await window.api.db.vocabulary.updateReview(current.id, {
        status: newStatus,
        reviewCount: result.reviewCount,
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        nextReviewAt: result.nextReviewAt.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      });

      setReviewedCount((c) => c + 1);

      if (reviewIndex + 1 < reviewQueue.length) {
        setReviewIndex((i) => i + 1);
      } else {
        // All done — show completion, then reload list
        setReviewIndex(-1);
        void loadVocabulary();
      }
    },
    [reviewQueue, reviewIndex, loadVocabulary]
  );

  const exitReview = useCallback(() => {
    setViewMode("list");
    void loadVocabulary();
  }, [loadVocabulary]);

  // ── Review Mode ──────────────────────────────────────────────────────────

  if (viewMode === "review") {
    if (reviewIndex < 0 || reviewIndex >= reviewQueue.length) {
      return (
        <main style={pageStyle}>
          <ReviewComplete reviewed={reviewedCount} onBack={exitReview} />
        </main>
      );
    }

    const currentCard = reviewQueue[reviewIndex];
    return (
      <main style={pageStyle}>
        {/* Back button */}
        <div
          style={{
            padding: "1rem 2rem 0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <button onClick={exitReview} style={backBtnStyle}>
            ← 返回列表
          </button>
        </div>
        <Flashcard
          item={currentCard}
          contexts={reviewContexts[currentCard.id] ?? []}
          onGrade={handleGrade}
          currentIndex={reviewIndex}
          total={reviewQueue.length}
        />
      </main>
    );
  }

  // ── List Mode ────────────────────────────────────────────────────────────

  return (
    <main style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
            生词本
          </h1>
          <span style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>
            {stats.total} 个词汇
          </span>
        </div>
        <button
          onClick={startReview}
          disabled={stats.total === 0}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            backgroundColor: stats.total > 0 ? "#1d1d1f" : "rgba(0,0,0,0.08)",
            color: stats.total > 0 ? "#fff" : "rgba(0,0,0,0.25)",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: stats.total > 0 ? "pointer" : "default",
          }}
        >
          开始复习
        </button>
      </div>

      {/* Stats bar */}
      <div style={statsBarStyle}>
        <StatPill label="新词" count={stats.newCount} color="#3b82f6" />
        <StatPill label="学习中" count={stats.learningCount} color="#f59e0b" />
        <StatPill label="已掌握" count={stats.masteredCount} color="#22c55e" />
      </div>

      {/* List */}
      <div style={listContainerStyle}>
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(0,0,0,0.3)", padding: "3rem" }}>
            加载中…
          </div>
        ) : vocabList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "rgba(0,0,0,0.3)",
              padding: "4rem 2rem",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>📖</div>
            <div style={{ fontSize: 15 }}>
              还没有生词，在精读模式中点击分词即可自动收集
            </div>
          </div>
        ) : (
          vocabList.map((item) => (
            <VocabCard
              key={item.id}
              item={item}
              onToggle={() => toggleExpand(item.id)}
              onDelete={() => handleDelete(item.id)}
              onMastered={() => handleMarkMastered(item.id)}
            />
          ))
        )}
      </div>
    </main>
  );
};

// ── VocabCard ────────────────────────────────────────────────────────────────

interface VocabCardProps {
  item: VocabWithContexts;
  onToggle: () => void;
  onDelete: () => void;
  onMastered: () => void;
}

const VocabCard: React.FC<VocabCardProps> = ({
  item,
  onToggle,
  onDelete,
  onMastered,
}) => {
  const basePos = item.pos?.split("-")[0] ?? "";
  const posZh = posChineseMap[basePos] ?? item.pos ?? "";

  return (
    <div style={cardStyle}>
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          cursor: "pointer",
          padding: "0.75rem 1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#1d1d1f" }}>
              {item.word}
            </span>
            {item.baseForm !== item.word && (
              <span style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>
                ({item.baseForm})
              </span>
            )}
            {item.reading && item.reading !== item.word && (
              <span style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>
                {item.reading}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(0,0,0,0.4)",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {posZh && <span>{posZh}</span>}
            {item.glosses && item.glosses.length > 0 && (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 300,
                }}
              >
                {item.glosses.slice(0, 3).join("; ")}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={item.status} />
        <span
          style={{
            fontSize: 14,
            color: "rgba(0,0,0,0.2)",
            transform: item.expanded ? "rotate(90deg)" : undefined,
            transition: "transform 0.15s",
          }}
        >
          ›
        </span>
      </div>

      {/* Expanded detail */}
      {item.expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(0,0,0,0.04)",
            padding: "0.75rem 1rem",
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
          }}
        >
          {item.contexts && item.contexts.length > 0 ? (
            <div style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(0,0,0,0.3)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                例句 ({item.contexts.length})
              </div>
              {item.contexts.map((ctx) => (
                <div
                  key={ctx.id}
                  style={{
                    padding: "4px 0",
                    lineHeight: 1.6,
                    borderBottom: "1px solid rgba(0,0,0,0.03)",
                  }}
                >
                  「{ctx.sentenceText}」
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "rgba(0,0,0,0.25)", marginBottom: "0.75rem" }}>
              暂无例句
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            {item.status !== "mastered" && (
              <button onClick={onMastered} style={actionBtnStyle}>
                ✓ 标记已掌握
              </button>
            )}
            <button
              onClick={onDelete}
              style={{ ...actionBtnStyle, color: "#ef4444" }}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── StatPill ─────────────────────────────────────────────────────────────────

const StatPill: React.FC<{ label: string; count: number; color: string }> = ({
  label,
  count,
  color,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      color: "rgba(0,0,0,0.5)",
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        display: "inline-block",
      }}
    />
    {label}
    <span style={{ fontWeight: 600, color: "#1d1d1f" }}>{count}</span>
  </div>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: "#fafafa",
};

const headerStyle: React.CSSProperties = {
  padding: "1.5rem 2rem 0.75rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const statsBarStyle: React.CSSProperties = {
  padding: "0 2rem 1rem",
  display: "flex",
  gap: "1.5rem",
  flexShrink: 0,
};

const listContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "0 2rem 2rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  backgroundColor: "#fff",
  border: "1px solid rgba(0,0,0,0.06)",
  overflow: "hidden",
  transition: "box-shadow 0.15s",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: "transparent",
  color: "rgba(0,0,0,0.5)",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 500,
};

const backBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: "transparent",
  color: "rgba(0,0,0,0.5)",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500,
};

export default VocabularyPage;
