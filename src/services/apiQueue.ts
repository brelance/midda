import { TokenData } from "../types/types";

type Task = () => Promise<TokenData[]>;

const queue: Task[] = [];
let activeRequests = 0;
const CONCURRENCY_LIMIT = 5; // 同样设置并发限制
let generationId = 0;

/**
 * Drain all pending tasks in the queue and increment the generation counter.
 * Any in-flight tasks that were enqueued before this call will auto-reject
 * when they eventually execute, because their captured `taskGeneration` won't
 * match the current `generationId`.
 *
 * Call this when switching chapters to prevent stale closures from lingering.
 */
export function clearQueue(): void {
  queue.length = 0;
  generationId++;
}

async function processQueue(): Promise<void> {
  while (activeRequests < CONCURRENCY_LIMIT && queue.length > 0) {
    const task = queue.shift();
    if (!task) continue;

    activeRequests++;

    try {
      await task();
    } catch (error) {
      // Silently ignore cancellation errors from stale tasks
      if (error instanceof Error && error.message === "cancelled") {
        // no-op
      } else {
        console.error("A task failed in the queue:", error);
      }
    } finally {
      activeRequests--;
      // 一个任务完成后，尝试处理下一个
      processQueue();
    }
  }
}

export function queuedSendTokensRequest(
  sentence: string,
  options?: { language?: string }
): Promise<TokenData[]> {
  const taskGeneration = generationId;
  return new Promise<TokenData[]>((resolve, reject) => {
    const task = async () => {
      // If the queue was cleared since this task was enqueued, skip it
      if (taskGeneration !== generationId) {
        reject(new Error("cancelled"));
        throw new Error("cancelled");
      }
      try {
        const result = await window.api.ai.sendTokensRequest({
          sentence,
          language: options?.language,
        });
        resolve(result);
        return result;
      } catch (error) {
        reject(error);
        throw error;
      }
    };
    queue.push(task);
    processQueue();
  });
}
