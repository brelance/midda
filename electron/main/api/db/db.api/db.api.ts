import { ipcMain } from "electron";
import {
  BookRepository,
  BookUpsertPayload,
  ChapterReadingPositionRepository,
  ChapterReadingPositionUpsertPayload,
  ChapterRepository,
  ChapterUpsertPayload,
  SentenceAnalysisJobRepository,
  SentenceAnalysisJobStatus,
  SentenceAnalysisJobUpsertPayload,
  SentenceAnalysisRepository,
  SentenceAnalysisUpsertPayload,
  UserPreferencesRepository,
  PageOcrCacheRepository,
} from "../../db/library.repositories";
import type { PageOcrCacheUpsertPayload } from "../../db/library.repositories";
import {
  VocabularyRepository,
  VocabStatus,
} from "../../db/vocabulary.repository";
import type { VocabularyUpsertPayload } from "../../db/vocabulary.repository";
import { CollectionRepository } from "../../db/collection.repository";

const bookRepository = new BookRepository();
const chapterRepository = new ChapterRepository();
const readingPositionRepository = new ChapterReadingPositionRepository();
const sentenceAnalysisRepository = new SentenceAnalysisRepository();
const sentenceAnalysisJobRepository = new SentenceAnalysisJobRepository();
const userPreferencesRepository = new UserPreferencesRepository();
const vocabularyRepository = new VocabularyRepository();
const collectionRepository = new CollectionRepository();
const pageOcrCacheRepository = new PageOcrCacheRepository();

export function registerDbHandlers(): void {
  // --- Books ---
  ipcMain.handle(
    "db:books:upsert",
    (_event, payload: BookUpsertPayload) => {
      return bookRepository.upsert(payload);
    }
  );

  ipcMain.handle("db:books:get", (_event, bookId: string) => {
    return bookRepository.getById(bookId);
  });

  ipcMain.handle("db:books:getAll", () => {
    return bookRepository.getAll();
  });

  ipcMain.handle("db:books:delete", (_event, bookId: string) => {
    return bookRepository.delete(bookId);
  });

  // --- Chapters ---
  ipcMain.handle(
    "db:chapters:bulkUpsert",
    (_event, payload: ChapterUpsertPayload[]) => {
      if (payload.length === 0) {
        return [];
      }
      const targetBookId = payload[0]!.bookId;
      const hasMismatchedBook = payload.some(
        (chapter) => chapter.bookId !== targetBookId
      );
      if (hasMismatchedBook) {
        throw new Error(
          "All chapter records in a bulk upsert must belong to the same book"
        );
      }
      chapterRepository.bulkUpsert(payload);
      return chapterRepository.getByBookId(targetBookId);
    }
  );

  ipcMain.handle(
    "db:chapters:getByBook",
    (_event, bookId: string) => {
      return chapterRepository.getByBookId(bookId);
    }
  );

  ipcMain.handle(
    "db:chapters:deleteByBook",
    (_event, bookId: string) => {
      return chapterRepository.deleteByBookId(bookId);
    }
  );

  // --- Chapter reading positions ---
  ipcMain.handle(
    "db:readingPositions:upsert",
    (_event, payload: ChapterReadingPositionUpsertPayload) => {
      return readingPositionRepository.upsert(payload);
    }
  );

  ipcMain.handle(
    "db:readingPositions:get",
    (_event, bookId: string, chapterId: string) => {
      return readingPositionRepository.get(bookId, chapterId);
    }
  );

  ipcMain.handle(
    "db:readingPositions:delete",
    (_event, bookId: string, chapterId: string) => {
      return readingPositionRepository.delete(bookId, chapterId);
    }
  );

  // --- Sentence analysis records ---
  ipcMain.handle(
    "db:sentenceAnalysis:upsert",
    (_event, payload: SentenceAnalysisUpsertPayload) => {
      return sentenceAnalysisRepository.upsert(payload);
    }
  );

  ipcMain.handle(
    "db:sentenceAnalysis:getBySentence",
    (
      _event,
      bookId: string,
      text: string,
      context?: { chapterId?: string; paragraphId?: string; sentenceId?: string }
    ) => {
      return sentenceAnalysisRepository.getBySentence(bookId, text, context);
    }
  );

  ipcMain.handle(
    "db:sentenceAnalysis:listByContext",
    (
      _event,
      bookId: string,
      filters?: { chapterId?: string; paragraphId?: string }
    ) => {
      return sentenceAnalysisRepository.listByContext(bookId, filters);
    }
  );

  // --- Sentence analysis jobs ---
  ipcMain.handle(
    "db:sentenceAnalysisJobs:enqueue",
    (_event, payload: SentenceAnalysisJobUpsertPayload) => {
      return sentenceAnalysisJobRepository.enqueue(payload);
    }
  );

  ipcMain.handle(
    "db:sentenceAnalysisJobs:updateStatus",
    (
      _event,
      jobId: number,
      status: SentenceAnalysisJobStatus,
      options?: { error?: string; resultRecordId?: number }
    ) => {
      return sentenceAnalysisJobRepository.updateStatus(jobId, status, options);
    }
  );

  ipcMain.handle(
    "db:sentenceAnalysisJobs:getPending",
    (_event, limit?: number) => {
      return sentenceAnalysisJobRepository.getPending(limit);
    }
  );

  ipcMain.handle(
    "db:sentenceAnalysisJobs:delete",
    (_event, jobId: number) => {
      return sentenceAnalysisJobRepository.delete(jobId);
    }
  );

  // --- User preferences ---
  ipcMain.handle(
    "db:userPreferences:set",
    (_event, key: string, value: string) => {
      return userPreferencesRepository.set(key, value);
    }
  );

  ipcMain.handle("db:userPreferences:get", (_event, key: string) => {
    return userPreferencesRepository.get(key);
  });

  ipcMain.handle("db:userPreferences:delete", (_event, key: string) => {
    return userPreferencesRepository.delete(key);
  });

  // --- Vocabulary ---
  ipcMain.handle(
    "db:vocabulary:upsert",
    (_event, payload: VocabularyUpsertPayload) => {
      return vocabularyRepository.upsert(payload);
    }
  );

  ipcMain.handle("db:vocabulary:getAll", () => {
    return vocabularyRepository.getAll();
  });

  ipcMain.handle(
    "db:vocabulary:getContexts",
    (_event, vocabId: number) => {
      return vocabularyRepository.getContexts(vocabId);
    }
  );

  ipcMain.handle("db:vocabulary:getBaseForms", () => {
    return vocabularyRepository.getAllBaseForms();
  });

  ipcMain.handle(
    "db:vocabulary:updateStatus",
    (_event, id: number, status: VocabStatus) => {
      return vocabularyRepository.updateStatus(id, status);
    }
  );

  ipcMain.handle("db:vocabulary:delete", (_event, id: number) => {
    return vocabularyRepository.delete(id);
  });

  ipcMain.handle(
    "db:vocabulary:getDue",
    (_event, limit?: number) => {
      return vocabularyRepository.getDueForReview(limit);
    }
  );

  ipcMain.handle(
    "db:vocabulary:updateReview",
    (
      _event,
      id: number,
      update: {
        status: VocabStatus;
        reviewCount: number;
        easeFactor: number;
        intervalDays: number;
        nextReviewAt: string;
        lastReviewedAt: string;
      }
    ) => {
      return vocabularyRepository.updateReview(id, update);
    }
  );

  // --- Collections ---
  ipcMain.handle(
    "db:collections:create",
    (_event, name: string) => {
      return collectionRepository.create({ name });
    }
  );

  ipcMain.handle("db:collections:getAll", () => {
    return collectionRepository.getAll();
  });

  ipcMain.handle(
    "db:collections:rename",
    (_event, id: string, name: string) => {
      return collectionRepository.rename(id, name);
    }
  );

  ipcMain.handle(
    "db:collections:delete",
    (_event, id: string) => {
      return collectionRepository.delete(id);
    }
  );

  ipcMain.handle(
    "db:collections:reorder",
    (_event, ids: string[]) => {
      return collectionRepository.reorder(ids);
    }
  );

  ipcMain.handle(
    "db:collections:addBook",
    (_event, collectionId: string, bookId: string) => {
      return collectionRepository.addBook(collectionId, bookId);
    }
  );

  ipcMain.handle(
    "db:collections:removeBook",
    (_event, collectionId: string, bookId: string) => {
      return collectionRepository.removeBook(collectionId, bookId);
    }
  );

  ipcMain.handle(
    "db:collections:getBookIds",
    (_event, collectionId: string) => {
      return collectionRepository.getBookIds(collectionId);
    }
  );

  // --- Page OCR Cache ---
  ipcMain.handle(
    "db:pageOcrCache:get",
    (_event, bookId: string, pageNumber: number, ocrEngine: string) => {
      return pageOcrCacheRepository.get(bookId, pageNumber, ocrEngine);
    }
  );

  ipcMain.handle(
    "db:pageOcrCache:upsert",
    (_event, payload: PageOcrCacheUpsertPayload) => {
      return pageOcrCacheRepository.upsert(payload);
    }
  );

  ipcMain.handle(
    "db:pageOcrCache:deleteByBook",
    (_event, bookId: string) => {
      return pageOcrCacheRepository.deleteByBook(bookId);
    }
  );
}
