import React, { useState, useEffect } from "react";
import { Book } from "../../types/types";
import { useCollectionStore } from "../../stores/collectionStore";

interface BookItemProps {
  book: Book;
  isSelected: boolean;
  onClick: () => void;
  onEnterReader?: (book: Book, chapterId?: string) => void;
  onDelete?: (book: Book) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  book,
  isSelected,
  onClick,
  onEnterReader,
  onDelete,
}) => {
  const { collections, addBookToCollection } = useCollectionStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCollectionSub, setShowCollectionSub] = useState(false);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => { setContextMenu(null); setShowCollectionSub(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleEnterReader = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEnterReader?.(book);
  };

  const handleDeleteBook = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.(book);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`
        group relative book-item text-center cursor-pointer
        transition-all duration-200
        ${isSelected ? "opacity-100" : ""}
      `}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDeleteBook}
          aria-label={`删除${book.title}`}
          className="
            absolute right-1 top-1 z-10
            flex h-6 w-6 items-center justify-center
            rounded-full bg-black/60 text-white
            opacity-0 transition-all duration-200
            hover:bg-black/80
            group-hover:opacity-100 focus:opacity-100
            focus:outline-none
          "
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Book cover */}
      <div
        className="
          relative mb-2 w-full overflow-hidden
          transition-all duration-300
          group-hover:-translate-y-1 group-hover:shadow-xl
        "
        style={{
          height: "168px",
          borderRadius: "2px 4px 4px 2px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 2px 0 8px rgba(0,0,0,0.08)",
          borderLeft: "1px solid rgba(255,255,255,0.4)",
        }}
      >
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          /* Placeholder cover with title */
          <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center p-2">
            <span className="text-gray-600 text-xs font-medium text-center leading-tight line-clamp-3">{book.title}</span>
          </div>
        )}

        {/* Hover overlay with read button */}
        {onEnterReader && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              className="pointer-events-auto bg-white/90 text-[12px] font-medium text-[#007aff] px-3 py-1 rounded-full backdrop-blur-sm hover:bg-white transition-colors"
              onClick={handleEnterReader}
            >
              阅读
            </button>
          </div>
        )}
      </div>

      {/* Title & author */}
      <p className="truncate text-[13px] font-semibold text-[#1d1d1f] text-left">{book.title}</p>
      <p className="text-[12px] text-gray-500 text-left truncate">{book.author}</p>

      {/* ── Right-click context menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-black/[0.08] py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onEnterReader && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-[13px] text-[#1d1d1f] hover:bg-[#007aff]/10 hover:text-[#007aff] transition-colors"
              onClick={() => { onEnterReader(book); setContextMenu(null); }}
            >
              阅读
            </button>
          )}

          {/* Move to collection submenu */}
          {collections.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setShowCollectionSub(true)}
              onMouseLeave={() => setShowCollectionSub(false)}
            >
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-[13px] text-[#1d1d1f] hover:bg-[#007aff]/10 hover:text-[#007aff] transition-colors flex items-center justify-between"
              >
                移入藏书分类
                <svg className="w-3 h-3 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {showCollectionSub && (
                <div className="absolute left-full top-0 ml-0.5 bg-white rounded-lg shadow-xl border border-black/[0.08] py-1 min-w-[120px]">
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-[13px] text-[#1d1d1f] hover:bg-[#007aff]/10 hover:text-[#007aff] transition-colors"
                      onClick={async () => {
                        await addBookToCollection(col.id, book.id);
                        setContextMenu(null);
                        setShowCollectionSub(false);
                      }}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {onDelete && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                onClick={() => { onDelete(book); setContextMenu(null); }}
              >
                删除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BookItem;
