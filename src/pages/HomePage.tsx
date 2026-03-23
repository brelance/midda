import React, { useMemo } from "react";
import type { Book, NavigationItem } from "../types/types";
import type { CollectionRecord } from "../types/database";
import { useCollectionStore } from "../stores/collectionStore";

interface HomePageProps {
  books: Book[];
  collections: CollectionRecord[];
  onEnterReader: (book: Book, chapterId?: string) => void;
  onNavChange: (nav: NavigationItem) => void;
}

const HomePage: React.FC<HomePageProps> = ({
  books,
  collections,
  onEnterReader,
  onNavChange,
}) => {
  const { createCollection } = useCollectionStore();

  const currentlyReading = useMemo(
    () => books.find((b) => b.status === "reading") ?? null,
    [books]
  );

  const recentlyAdded = useMemo(
    () =>
      [...books]
        .sort((a, b) => b.addedDate.getTime() - a.addedDate.getTime())
        .slice(0, 8),
    [books]
  );

  const stats = useMemo(() => {
    const total = books.length;
    const reading = books.filter((b) => b.status === "reading").length;
    const completed = books.filter((b) => b.status === "completed").length;
    return { total, reading, completed };
  }, [books]);

  // Vocabulary count
  const [vocabCount, setVocabCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window?.api?.db?.vocabulary?.getAll) return;
      const all = await window.api.db.vocabulary.getAll();
      if (!cancelled) setVocabCount(all.length);
    })();
    return () => { cancelled = true; };
  }, []);

  // P3 fix: single batched effect for collection counts + covers
  const [collectionBookCounts, setCollectionBookCounts] = React.useState<
    Record<string, number>
  >({});
  const [collectionCovers, setCollectionCovers] = React.useState<
    Record<string, string[]>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window?.api?.db?.collections?.getBookIds || collections.length === 0) return;

      const results = await Promise.all(
        collections.map(async (col) => {
          const ids = await window.api.db.collections.getBookIds(col.id);
          return { id: col.id, ids };
        })
      );

      if (cancelled) return;

      const counts: Record<string, number> = {};
      const covers: Record<string, string[]> = {};

      for (const { id, ids } of results) {
        counts[id] = ids.length;
        covers[id] = ids
          .map((bookId) => books.find((b) => b.id === bookId))
          .filter((b): b is Book => !!b && !!b.cover)
          .slice(0, 4)
          .map((b) => b.cover!);
      }

      if (!cancelled) {
        setCollectionBookCounts(counts);
        setCollectionCovers(covers);
      }
    })();
    return () => { cancelled = true; };
  }, [collections, books]);

  // P2 fix: empty-state handler that actually creates a collection
  const handleCreateFirstCollection = async () => {
    const record = await createCollection("我的藏书");
    if (record) {
      onNavChange(`collection:${record.id}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Drag zone for window title bar */}
      <div
        className="h-[52px] flex-shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <div className="flex-grow overflow-y-auto no-scrollbar">
        <div className="max-w-[960px] mx-auto px-8 pb-20">

          {/* ── 继续阅读 ── */}
          {currentlyReading && (
            <section className="mb-10">
              <h2 className="text-[22px] font-bold mb-4 text-[#1d1d1f]">
                继续阅读
              </h2>
              <div
                className="
                  flex items-center cursor-pointer
                  bg-gradient-to-r from-[#a7a695] to-[#838270]
                  rounded-[14px] p-5 max-w-[480px]
                  shadow-lg hover:shadow-xl transition-all duration-300
                  hover:scale-[1.01]
                "
                onClick={() => {
                  const fallbackId =
                    currentlyReading.currentChapterId ??
                    currentlyReading.lastReadChapterId ??
                    currentlyReading.chapters?.[0]?.id;
                  onEnterReader(currentlyReading, fallbackId);
                }}
              >
                <div
                  className="w-[72px] h-[108px] flex-shrink-0 mr-5 overflow-hidden bg-gray-200"
                  style={{
                    borderRadius: "2px 5px 5px 2px",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  {currentlyReading.cover ? (
                    <img
                      src={currentlyReading.cover}
                      alt={currentlyReading.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#f8f5e6] flex items-center justify-center p-1">
                      <span className="text-[9px] text-gray-700 text-center leading-tight">
                        {currentlyReading.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-white min-w-0">
                  <h3 className="font-bold text-[17px] leading-tight mb-1 opacity-95 truncate">
                    {currentlyReading.title}
                  </h3>
                  <p className="text-[14px] opacity-75 mb-3 truncate">
                    {currentlyReading.author}
                  </p>
                  <div className="w-full h-1.5 bg-white/25 rounded-full">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${currentlyReading.progress}%` }}
                    />
                  </div>
                  <p className="text-[12px] opacity-65 mt-1.5">
                    已读 {currentlyReading.progress}%
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── 最近添加 ── */}
          {recentlyAdded.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-bold text-[#1d1d1f]">
                  最近添加
                </h2>
                <button
                  type="button"
                  className="text-[13px] text-[#007aff] hover:text-[#005ec4] transition-colors font-medium"
                  onClick={() => onNavChange("bookshelf")}
                >
                  查看全部
                </button>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-2 no-scrollbar">
                {recentlyAdded.map((book) => (
                  <div
                    key={book.id}
                    className="flex-shrink-0 w-[110px] cursor-pointer group"
                    onClick={() => onEnterReader(book)}
                  >
                    <div
                      className="
                        w-full overflow-hidden mb-2
                        transition-all duration-300
                        group-hover:-translate-y-1 group-hover:shadow-xl
                      "
                      style={{
                        height: "154px",
                        borderRadius: "2px 4px 4px 2px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 2px 0 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center p-2">
                          <span className="text-gray-600 text-[10px] font-medium text-center leading-tight line-clamp-3">
                            {book.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] font-semibold text-[#1d1d1f] truncate">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {book.author}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Bottom row: 我的藏书速览 + 阅读概览 ── */}
          <div className="flex gap-8 flex-wrap">
            {/* ── 我的藏书速览 ── */}
            <section className="flex-1 min-w-[300px]">
              <h2 className="text-[22px] font-bold mb-4 text-[#1d1d1f]">
                我的藏书
              </h2>
              {collections.length > 0 ? (
                <div className="flex gap-4 flex-wrap">
                  {collections.map((col) => {
                    const covers = collectionCovers[col.id] ?? [];
                    const count = collectionBookCounts[col.id] ?? 0;
                    return (
                      <div
                        key={col.id}
                        className="
                          w-[140px] cursor-pointer group
                          rounded-[12px] border border-black/[0.06]
                          bg-[#fafafa] hover:bg-[#f0f0f0]
                          p-3 transition-all duration-200
                          hover:shadow-md hover:scale-[1.02]
                        "
                        onClick={() =>
                          onNavChange(`collection:${col.id}`)
                        }
                      >
                        <div className="grid grid-cols-2 gap-1 mb-2.5 aspect-square rounded-[6px] overflow-hidden bg-gray-100">
                          {[0, 1, 2, 3].map((i) =>
                            covers[i] ? (
                              <img
                                key={i}
                                src={covers[i]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                key={i}
                                className="w-full h-full bg-gray-200/60"
                              />
                            )
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">
                          {col.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {count} 本
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  className="
                    flex items-center gap-2 px-4 py-3
                    rounded-[10px] border-[1.5px] border-dashed border-gray-300
                    text-[13px] text-gray-400 hover:text-[#007aff] hover:border-[#007aff]/30
                    transition-colors
                  "
                  onClick={handleCreateFirstCollection}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  创建第一个藏书分类
                </button>
              )}
            </section>

            {/* ── 阅读概览 ── */}
            <section className="w-[200px] flex-shrink-0">
              <h2 className="text-[22px] font-bold mb-4 text-[#1d1d1f]">
                阅读概览
              </h2>
              <div className="space-y-3">
                <StatRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#007aff" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                  label="总藏书"
                  value={`${stats.total} 本`}
                />
                <StatRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#ff9500" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="阅读中"
                  value={`${stats.reading} 本`}
                />
                <StatRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#34c759" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="已读完"
                  value={`${stats.completed} 本`}
                />
                <StatRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#af52de" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" />
                    </svg>
                  }
                  label="生词"
                  value={vocabCount !== null ? `${vocabCount} 个` : "–"}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

// ── Stat row sub-component ──

const StatRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-[7px] bg-gray-50">
      {icon}
    </span>
    <span className="text-[13px] text-gray-500 flex-1">{label}</span>
    <span className="text-[14px] font-semibold text-[#1d1d1f]">{value}</span>
  </div>
);

export default HomePage;
