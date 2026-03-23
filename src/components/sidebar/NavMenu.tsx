import React, { useState, useRef, useEffect } from 'react';
import NavItem from './NavItem';
import { NavigationItem } from '../../types/types';
import { useCollectionStore } from '../../stores/collectionStore';

interface NavMenuProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
}

const FolderIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const NavMenu: React.FC<NavMenuProps> = ({ activeNav, onNavChange }) => {
  const { collections, loadCollections, createCollection, renameCollection, deleteCollection } = useCollectionStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (isCreating) createInputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setIsCreating(false); setNewName(''); return; }
    await createCollection(trimmed);
    setIsCreating(false);
    setNewName('');
  };

  const handleRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) await renameCollection(renamingId, trimmed);
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = async (id: string) => {
    await deleteCollection(id);
    setContextMenu(null);
    // If the deleted collection was active, go back to bookshelf
    if (activeNav === `collection:${id}`) {
      onNavChange('bookshelf');
    }
  };

  return (
    <nav className="space-y-5">
      {/* ── Primary ── */}
      <div>
        <NavItem
          label="主页"
          isActive={activeNav === 'bookshelf'}
          onClick={() => onNavChange('bookshelf')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
      </div>

      {/* ── 书库 ── */}
      <div>
        <div className="px-2 mb-1 text-[12px] font-medium text-[#86868b] tracking-wide select-none">
          书库
        </div>
        <NavItem
          label="全部"
          isActive={activeNav === 'bookshelf'}
          onClick={() => onNavChange('bookshelf')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <NavItem
          label="欲读清单"
          isActive={activeNav === 'want-to-read'}
          onClick={() => onNavChange('want-to-read')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <NavItem
          label="已读完"
          isActive={activeNav === 'completed'}
          onClick={() => onNavChange('completed')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── 我的藏书 ── */}
      <div>
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[12px] font-medium text-[#86868b] tracking-wide select-none">
            我的藏书
          </span>
          <button
            type="button"
            onClick={() => { setIsCreating(true); setNewName(''); }}
            className="text-[#86868b] hover:text-[#007aff] transition-colors p-0.5 rounded"
            title="新建藏书分类"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Dynamic collection items */}
        {collections.map((col) => (
          <div
            key={col.id}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ id: col.id, x: e.clientX, y: e.clientY });
            }}
          >
            {renamingId === col.id ? (
              <div className="px-2 py-[3px]">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                  }}
                  className="w-full text-[13px] px-1.5 py-[3px] rounded border border-[#007aff] bg-white outline-none
                    focus:ring-2 focus:ring-[#007aff]/20"
                />
              </div>
            ) : (
              <NavItem
                label={col.name}
                isActive={activeNav === `collection:${col.id}`}
                onClick={() => onNavChange(`collection:${col.id}`)}
                icon={<FolderIcon />}
              />
            )}
          </div>
        ))}

        {/* Inline create input */}
        {isCreating && (
          <div className="px-2 py-[3px]">
            <input
              ref={createInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
              }}
              placeholder="分类名称…"
              className="w-full text-[13px] px-1.5 py-[3px] rounded border border-[#007aff] bg-white outline-none
                focus:ring-2 focus:ring-[#007aff]/20"
            />
          </div>
        )}

        {/* Fallback when no collections and not creating */}
        {collections.length === 0 && !isCreating && (
          <NavItem
            label="新建藏书"
            isActive={false}
            onClick={() => { setIsCreating(true); setNewName(''); }}
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          />
        )}
      </div>

      {/* ── 学习 ── */}
      <div>
        <div className="px-2 mb-1 text-[12px] font-medium text-[#86868b] tracking-wide select-none">
          学习
        </div>
        <NavItem
          label="生词本"
          isActive={activeNav === 'vocabulary'}
          onClick={() => onNavChange('vocabulary')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" />
            </svg>
          }
        />
      </div>

      {/* ── Context menu for collection items ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-black/[0.08] py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-[13px] text-[#1d1d1f] hover:bg-[#007aff]/10 hover:text-[#007aff] transition-colors"
            onClick={() => {
              const col = collections.find((c) => c.id === contextMenu.id);
              if (col) {
                setRenamingId(col.id);
                setRenameValue(col.name);
              }
              setContextMenu(null);
            }}
          >
            重命名
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
            onClick={() => handleDelete(contextMenu.id)}
          >
            删除
          </button>
        </div>
      )}
    </nav>
  );
};

export default NavMenu;