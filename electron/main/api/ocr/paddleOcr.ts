/**
 * PaddleOCR-VL 1.5 — Remote OCR via PaddleOCR Official Cloud API.
 *
 * Uses the async Job API:
 *   1. POST /api/v2/ocr/jobs  → submit image as multipart file
 *   2. GET  /api/v2/ocr/jobs/{jobId} → poll until state === "done"
 *   3. GET  resultUrl.jsonUrl  → download JSONL results
 *   4. Parse layoutParsingResults → extract markdown text
 */

import dotenv from "dotenv";
import type {
  MangaOcrRequest,
  MangaOcrResult,
  PositionedOcrBlock,
} from "../../../../src/types/ocr";

import {
  parsePaddleOcrJsonl,
  shouldSavePaddleOcrDebugJsonl,
} from "./paddleOcr.shared";

dotenv.config();

// ── Configuration ────────────────────────────────────────────────────────────

const PADDLE_OCR_URL =
  process.env.PADDLE_OCR_URL || "https://paddleocr.aistudio-app.com";
const PADDLE_OCR_TOKEN = process.env.PADDLE_OCR_TOKEN || "";
const PADDLE_OCR_MODEL = "PaddleOCR-VL-1.5";

/** Max time to wait for a job to complete (ms) */
const JOB_TIMEOUT_MS = 120_000;
/** Interval between status polls (ms) */
const POLL_INTERVAL_MS = 2_000;

// ── Types ────────────────────────────────────────────────────────────────────

const PADDLE_OCR_DEBUG_SAVE_JSONL = shouldSavePaddleOcrDebugJsonl(process.env);
const activeRequestControllers = new Map<string, AbortController>();

// ── Internal helpers ─────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `bearer ${PADDLE_OCR_TOKEN}`,
  };
}

/**
 * Convert a base64 data URL or raw base64 string to a Buffer + mime type.
 */
function base64ToBuffer(imageInput: string): { buffer: Buffer; mimeType: string; ext: string } {
  let base64Data: string;
  let mimeType = "image/png";

  if (imageInput.startsWith("data:")) {
    const match = imageInput.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = imageInput.split(",")[1] || imageInput;
    }
  } else {
    base64Data = imageInput;
  }

  const ext = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpg" : "png";
  return { buffer: Buffer.from(base64Data, "base64"), mimeType, ext };
}

/**
 * Sleep for the given milliseconds.
 */
function createCancelledError(requestId?: string): Error {
  const error = new Error(
    requestId ? `PaddleOCR 请求已取消: ${requestId}` : "PaddleOCR 请求已取消"
  );
  error.name = "PaddleOcrCancelledError";
  return error;
}

export function isPaddleOcrCancelledError(error: unknown): boolean {
  return (
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "PaddleOcrCancelledError")) ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function sleep(ms: number, signal?: AbortSignal, requestId?: string): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createCancelledError(requestId));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(createCancelledError(requestId));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

// ── Job API ──────────────────────────────────────────────────────────────────

/**
 * Submit an OCR job with a local image buffer.
 * Returns the jobId.
 */
async function submitJob(
  imageBuffer: Buffer,
  mimeType: string,
  ext: string,
  signal: AbortSignal
): Promise<string> {
  const boundary = `----FormBoundary${Date.now()}`;
  const fileName = `image.${ext}`;

  // Build multipart/form-data body manually (Node.js compatible)
  const parts: Buffer[] = [];

  // model field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${PADDLE_OCR_MODEL}\r\n`
  ));

  // optionalPayload field
  const optionalPayload = JSON.stringify({
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useChartRecognition: false,
  });
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="optionalPayload"\r\n\r\n${optionalPayload}\r\n`
  ));

  // file field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(imageBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(`${PADDLE_OCR_URL}/api/v2/ocr/jobs`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    signal,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `PaddleOCR 提交任务失败 (${response.status}): ${errorText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const jobId = data?.data?.jobId;
  if (!jobId) {
    throw new Error(`PaddleOCR 返回的任务 ID 为空: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log(`[PaddleOCR] Job submitted: ${jobId}`);
  return jobId;
}

/**
 * Poll a job until it completes or fails.
 * Returns the JSONL download URL.
 */
async function pollJobUntilDone(
  jobId: string,
  signal: AbortSignal,
  requestId: string
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < JOB_TIMEOUT_MS) {
    const response = await fetch(`${PADDLE_OCR_URL}/api/v2/ocr/jobs/${jobId}`, {
      headers: getAuthHeaders(),
      signal,
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR 查询任务状态失败 (${response.status})`);
    }

    const data = await response.json();
    const state = data?.data?.state;

    if (state === "done") {
      const jsonUrl = data?.data?.resultUrl?.jsonUrl;
      if (!jsonUrl) {
        throw new Error("PaddleOCR 任务完成但结果 URL 为空");
      }
      const extracted = data?.data?.extractProgress?.extractedPages ?? "?";
      console.log(`[PaddleOCR] Job ${jobId} done, extracted ${extracted} page(s)`);
      return jsonUrl;
    }

    if (state === "failed") {
      const errorMsg = data?.data?.errorMsg || "未知错误";
      throw new Error(`PaddleOCR 任务失败: ${errorMsg}`);
    }

    // state is "pending" or "running" — keep polling
    console.log(`[PaddleOCR] Job ${jobId} state: ${state}`);
    await sleep(POLL_INTERVAL_MS, signal, requestId);
  }

  throw new Error(`PaddleOCR 任务超时（${JOB_TIMEOUT_MS / 1000}秒），jobId: ${jobId}`);
}

/**
 * Download and parse the JSONL result file.
 * Extracts positioned text blocks from parsing_res_list and optionally saves
 * the raw JSONL when explicit debug logging is enabled.
 */
async function fetchAndParseResults(
  jsonlUrl: string,
  signal: AbortSignal
): Promise<{
  blocks: PositionedOcrBlock[];
  sourceWidth?: number;
  sourceHeight?: number;
}> {
  const response = await fetch(jsonlUrl, { signal });
  if (!response.ok) {
    throw new Error(`下载 PaddleOCR 结果失败 (${response.status})`);
  }

  const content = await response.text();

  // DEBUG: 临时输出原始 JSONL，用完删除
  console.log("[PaddleOCR] RAW JSONL OUTPUT ↓↓↓\n" + content + "\n[PaddleOCR] RAW JSONL END ↑↑↑");

  if (PADDLE_OCR_DEBUG_SAVE_JSONL) {
    const { promises: fs } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmpPath = path.join(os.tmpdir(), `paddleocr_result_${Date.now()}.jsonl`);
    await fs.writeFile(tmpPath, content, "utf-8");
    console.log(`[PaddleOCR] JSONL result saved to: ${tmpPath}`);
  }

  return parsePaddleOcrJsonl(content);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if the PaddleOCR service is reachable and token is configured.
 */
export async function checkPaddleOcrHealth(): Promise<boolean> {
  if (!PADDLE_OCR_TOKEN) {
    console.warn("[PaddleOCR] PADDLE_OCR_TOKEN not configured");
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    // Simple connectivity check — try to reach the API endpoint
    const response = await fetch(`${PADDLE_OCR_URL}/api/v2/ocr/jobs`, {
      method: "HEAD",
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // 405 Method Not Allowed is expected for HEAD on a POST-only endpoint — still means service is up
    return response.ok || response.status === 405 || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Perform OCR on an image using PaddleOCR Official Cloud API.
 *
 * Flow: submit job → poll status → fetch JSONL → extract positioned blocks
 *
 * @param imageInput - data URL (data:image/...;base64,...) or raw base64 string
 * @returns OCR result with positioned text blocks
 */
export async function recognizeWithPaddleOcr(
  request: MangaOcrRequest
): Promise<MangaOcrResult> {
  const { requestId, imageInput } = request;
  if (!PADDLE_OCR_TOKEN) {
    throw new Error(
      "PaddleOCR Token 未配置，请在 .env 中设置 PADDLE_OCR_TOKEN"
    );
  }

  const controller = new AbortController();
  activeRequestControllers.set(requestId, controller);

  try {
    const { buffer, mimeType, ext } = base64ToBuffer(imageInput);
    const jobId = await submitJob(buffer, mimeType, ext, controller.signal);
    const jsonlUrl = await pollJobUntilDone(jobId, controller.signal, requestId);
    const { blocks, sourceWidth, sourceHeight } = await fetchAndParseResults(
      jsonlUrl,
      controller.signal
    );

    if (blocks.length === 0) {
      return { text: "", confidence: 0, blocks: [] };
    }

    const fullText = blocks.map((b) => b.text).join("\n");

    return {
      text: fullText,
      confidence: 1.0,
      blocks,
      sourceWidth,
      sourceHeight,
    };
  } catch (error) {
    if (isPaddleOcrCancelledError(error)) {
      throw createCancelledError(requestId);
    }
    throw error;
  } finally {
    activeRequestControllers.delete(requestId);
  }
}

export function cancelPaddleOcrRequest(requestId: string): boolean {
  const controller = activeRequestControllers.get(requestId);
  if (!controller) return false;

  controller.abort();
  activeRequestControllers.delete(requestId);
  return true;
}
