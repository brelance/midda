import crypto from "node:crypto";
import db from "./database";
import type { CollectionRecord, CollectionCreatePayload } from "../../../../src/types/database";

// Re-export for consumers that import from this module
export type { CollectionRecord, CollectionCreatePayload };

// ── Internal row shape ─────────────────────────────────────────────────────

interface CollectionRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CollectionRow): CollectionRecord {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Repository ─────────────────────────────────────────────────────────────

export class CollectionRepository {
  // ── Collections CRUD ──

  private readonly insertStmt = db.prepare(`
    INSERT INTO collections (id, name, sort_order)
    VALUES (@id, @name, @sortOrder)
  `);

  private readonly renameStmt = db.prepare(`
    UPDATE collections
    SET name = @name, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  private readonly deleteStmt = db.prepare(`
    DELETE FROM collections WHERE id = ?
  `);

  private readonly getAllStmt = db.prepare(`
    SELECT id, name, sort_order, created_at, updated_at
    FROM collections
    ORDER BY sort_order ASC, created_at ASC
  `);

  private readonly getByIdStmt = db.prepare(`
    SELECT id, name, sort_order, created_at, updated_at
    FROM collections
    WHERE id = ?
  `);

  private readonly maxSortOrderStmt = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM collections
  `);

  private readonly updateSortOrderStmt = db.prepare(`
    UPDATE collections
    SET sort_order = @sortOrder, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  // ── Collection-Book join ──

  private readonly addBookStmt = db.prepare(`
    INSERT OR IGNORE INTO collection_books (collection_id, book_id)
    VALUES (@collectionId, @bookId)
  `);

  private readonly removeBookStmt = db.prepare(`
    DELETE FROM collection_books
    WHERE collection_id = @collectionId AND book_id = @bookId
  `);

  private readonly getBookIdsStmt = db.prepare(`
    SELECT book_id FROM collection_books
    WHERE collection_id = ?
    ORDER BY added_at ASC
  `);

  // ── Methods ──

  create(payload: CollectionCreatePayload): CollectionRecord {
    const id = crypto.randomUUID();
    const maxRow = this.maxSortOrderStmt.get() as { max_order: number };
    const sortOrder = maxRow.max_order + 1;

    this.insertStmt.run({ id, name: payload.name, sortOrder });

    const row = this.getByIdStmt.get(id) as CollectionRow | undefined;
    if (!row) throw new Error("Failed to retrieve collection after insert");
    return mapRow(row);
  }

  rename(id: string, name: string): CollectionRecord {
    const result = this.renameStmt.run({ id, name });
    if (result.changes === 0) throw new Error(`Collection ${id} not found`);

    const row = this.getByIdStmt.get(id) as CollectionRow | undefined;
    if (!row) throw new Error("Failed to retrieve collection after rename");
    return mapRow(row);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  getAll(): CollectionRecord[] {
    const rows = this.getAllStmt.all() as CollectionRow[];
    return rows.map(mapRow);
  }

  reorder(ids: string[]): void {
    const tx = db.transaction((orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        this.updateSortOrderStmt.run({ id: orderedIds[i], sortOrder: i });
      }
    });
    tx(ids);
  }

  // ── Book membership ──

  addBook(collectionId: string, bookId: string): void {
    this.addBookStmt.run({ collectionId, bookId });
  }

  removeBook(collectionId: string, bookId: string): boolean {
    const result = this.removeBookStmt.run({ collectionId, bookId });
    return result.changes > 0;
  }

  getBookIds(collectionId: string): string[] {
    const rows = this.getBookIdsStmt.all(collectionId) as { book_id: string }[];
    return rows.map((r) => r.book_id);
  }
}
