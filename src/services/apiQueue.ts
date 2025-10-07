import { TokenData } from "../types/types";

type Task = () => Promise<TokenData[]>;

const queue: Task[] = [];
let activeRequests = 0;
const CONCURRENCY_LIMIT = 5; // 同样设置并发限制

async function processQueue(): Promise<void> {
  while (activeRequests < CONCURRENCY_LIMIT && queue.length > 0) {
    const task = queue.shift();
    if (!task) continue;

    activeRequests++;

    try {
      // 执行任务，任务本身就是一个会 resolve 或 reject 的 aysnc 函数
      await task();
    } catch (error) {
      // 错误已经在 task 内部的 Promise 中被 reject，这里不需要额外处理
      console.error("A task failed in the queue:", error);
    } finally {
      activeRequests--;
      // 一个任务完成后，尝试处理下一个
      processQueue();
    }
  }
}

export function queuedSendGeminiRequest(prompt: string): Promise<TokenData[]> {
  return new Promise<TokenData[]>((resolve, reject) => {
    // 将实际的 API 调用包装成一个 task 函数
    const task = async () => {
      try {
        const result = await window.api.ai.sendGeminiRequest(prompt);
        resolve(result);
        return result; // 返回值给 processQueue，虽然那里没用
      } catch (error) {
        reject(error);
        throw error; // 抛出错误以通知 processQueue
      }
    };
    queue.push(task);
    processQueue();
  });
}
