export function calculateScrollProgress(element: HTMLElement | null): number {
  if (!element) {
    return 0;
  }

  const { scrollTop, scrollHeight, clientHeight } = element;
  if (scrollHeight <= clientHeight) {
    return 100;
  }

  const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
  return Math.min(100, Math.max(0, Number(progress.toFixed(2))));
}

export function deriveBookProgressFromChapter(
  chapterIndex: number,
  totalChapters: number,
  chapterProgress: number
): number {
  if (totalChapters <= 0) {
    return 0;
  }

  const baseProgress = (chapterIndex / totalChapters) * 100;
  const chapterContribution = chapterProgress / totalChapters;

  return Math.min(100, Math.max(0, Number((baseProgress + chapterContribution).toFixed(2))));
}
