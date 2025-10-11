import { Chapter } from "../../types/types";

export function findChapterIndex(
  chapters: Chapter[],
  chapterId: string
): number {
  return chapters.findIndex((chapter) => chapter.id === chapterId);
}

export function getChapterByIndex(
  chapters: Chapter[],
  index: number
): Chapter | null {
  if (index < 0 || index >= chapters.length) {
    return null;
  }
  return chapters[index];
}

export function getNextChapterId(
  chapters: Chapter[],
  currentIndex: number
): string | null {
  const next = getChapterByIndex(chapters, currentIndex + 1);
  return next ? next.id : null;
}

export function getPrevChapterId(
  chapters: Chapter[],
  currentIndex: number
): string | null {
  const prev = getChapterByIndex(chapters, currentIndex - 1);
  return prev ? prev.id : null;
}

export function isFirstChapter(currentIndex: number): boolean {
  return currentIndex <= 0;
}

export function isLastChapter(
  chapters: Chapter[],
  currentIndex: number
): boolean {
  return currentIndex >= chapters.length - 1;
}
