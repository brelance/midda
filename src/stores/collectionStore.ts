import { create } from "zustand";
import type { CollectionRecord } from "../types/database";

export interface CollectionState {
  collections: CollectionRecord[];
  /** Incremented whenever collection↔book membership changes, used to trigger re-fetch */
  bookMembershipVersion: number;

  // ── Actions ──
  loadCollections: () => Promise<void>;
  createCollection: (name: string) => Promise<CollectionRecord | undefined>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addBookToCollection: (collectionId: string, bookId: string) => Promise<void>;
  removeBookFromCollection: (collectionId: string, bookId: string) => Promise<void>;
  getBookIdsForCollection: (collectionId: string) => Promise<string[]>;
}

export const useCollectionStore = create<CollectionState>()((set) => ({
  collections: [],
  bookMembershipVersion: 0,

  loadCollections: async () => {
    if (typeof window === "undefined" || !window.api?.db?.collections?.getAll) {
      return;
    }
    try {
      const records = await window.api.db.collections.getAll();
      set({ collections: records });
    } catch (error) {
      console.error("加载藏书分类失败:", error);
    }
  },

  createCollection: async (name: string) => {
    if (!window?.api?.db?.collections?.create) return undefined;
    try {
      const record = await window.api.db.collections.create(name);
      set((s) => ({ collections: [...s.collections, record] }));
      return record;
    } catch (error) {
      console.error("创建藏书分类失败:", error);
      return undefined;
    }
  },

  renameCollection: async (id, name) => {
    if (!window?.api?.db?.collections?.rename) return;
    try {
      const updated = await window.api.db.collections.rename(id, name);
      set((s) => ({
        collections: s.collections.map((c) => (c.id === id ? updated : c)),
      }));
    } catch (error) {
      console.error("重命名藏书分类失败:", error);
    }
  },

  deleteCollection: async (id) => {
    if (!window?.api?.db?.collections?.delete) return;
    try {
      await window.api.db.collections.delete(id);
      set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("删除藏书分类失败:", error);
    }
  },

  addBookToCollection: async (collectionId, bookId) => {
    if (!window?.api?.db?.collections?.addBook) return;
    try {
      await window.api.db.collections.addBook(collectionId, bookId);
      set((s) => ({ bookMembershipVersion: s.bookMembershipVersion + 1 }));
    } catch (error) {
      console.error("添加书籍到分类失败:", error);
    }
  },

  removeBookFromCollection: async (collectionId, bookId) => {
    if (!window?.api?.db?.collections?.removeBook) return;
    try {
      await window.api.db.collections.removeBook(collectionId, bookId);
      set((s) => ({ bookMembershipVersion: s.bookMembershipVersion + 1 }));
    } catch (error) {
      console.error("从分类移除书籍失败:", error);
    }
  },

  getBookIdsForCollection: async (collectionId) => {
    if (!window?.api?.db?.collections?.getBookIds) return [];
    try {
      return await window.api.db.collections.getBookIds(collectionId);
    } catch (error) {
      console.error("获取分类书籍失败:", error);
      return [];
    }
  },
}));
