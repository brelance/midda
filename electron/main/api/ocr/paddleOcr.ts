/**
 * PaddleOCR-VL 1.5 — Remote OCR via vLLM OpenAI-compatible API.
 *
 * Calls the /v1/chat/completions endpoint with a multimodal message
 * containing a base64 image and a structured prompt that instructs
 * the VLM to return recognised text with bounding-box coordinates.
 */

import dotenv from "dotenv";
dotenv.config();

// ── Configuration ────────────────────────────────────────────────────────────

const PADDLE_OCR_URL = process.env.PADDLE_OCR_URL || "http://localhost:8000";
const PADDLE_OCR_MODEL = "PaddleOCR-VL-1.5";
const REQUEST_TIMEOUT_MS = 60_000; // VLM inference can be slow

// ── Types ────────────────────────────────────────────────────────────────────

export interface PaddleOcrBlock {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaddleOcrResult {
  /** Concatenated full text */
  text: string;
  /** Average confidence */
  confidence: number;
  /** Individual text blocks with positions */
  blocks: PaddleOcrBlock[];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a 4-point bounding box [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
 * to a simple { x, y, width, height } rectangle.
 */
function boxToRect(box: number[][]): { x: number; y: number; width: number; height: number } {
  const xs = box.map((p) => p[0]);
  const ys = box.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Attempt to extract a JSON array from the VLM's text response.
 * The model may wrap it in ```json ... ``` fences or other text.
 */
function parseVlmResponse(content: string): Array<{ text: string; box?: number[][] }> {
  // Try to find a JSON array in the response
  // Strategy 1: direct JSON parse
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    // If it's a wrapper object, look for common keys
    if (parsed.results && Array.isArray(parsed.results)) return parsed.results;
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
  } catch {
    // not valid JSON on its own
  }

  // Strategy 2: extract JSON from code fences
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue
    }
  }

  // Strategy 3: find the first [ ... ] in the text
  const bracketMatch = content.match(/\[[\s\S]*?\]/);
  if (bracketMatch) {
    try {
      return JSON.parse(bracketMatch[0]);
    } catch {
      // continue
    }
  }

  // Fallback: return the entire content as a single text block
  return [{ text: content.trim() }];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const OCR_PROMPT = `请识别图片中的所有文字。以JSON数组格式返回结果，每个元素包含:
- "text": 识别到的文字内容
- "box": 文字区域的四点坐标 [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]

只返回JSON数组，不要其他说明文字。`;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if the PaddleOCR vLLM service is online and the model is loaded.
 */
export async function checkPaddleOcrHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(`${PADDLE_OCR_URL}/v1/models`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return false;

    const data = await response.json();
    // OpenAI format: { data: [{ id: "model-name", ... }] }
    if (data?.data && Array.isArray(data.data)) {
      return data.data.some(
        (m: { id?: string }) =>
          m.id === PADDLE_OCR_MODEL || m.id?.includes("PaddleOCR")
      );
    }
    return true; // endpoint responded, assume OK
  } catch {
    return false;
  }
}

/**
 * Perform OCR on an image using PaddleOCR-VL 1.5 via vLLM.
 *
 * @param imageInput - data URL (data:image/...;base64,...) or raw base64 string
 * @returns OCR result with positioned text blocks
 */
export async function recognizeWithPaddleOcr(
  imageInput: string
): Promise<PaddleOcrResult> {
  // Ensure we have a proper data URL
  let dataUrl: string;
  if (imageInput.startsWith("data:")) {
    dataUrl = imageInput;
  } else {
    // Assume raw base64, default to PNG
    dataUrl = `data:image/png;base64,${imageInput}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${PADDLE_OCR_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: PADDLE_OCR_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: OCR_PROMPT,
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw new Error("PaddleOCR 请求超时（60秒），请检查服务器状态");
    }
    throw new Error(`无法连接 PaddleOCR 服务 (${PADDLE_OCR_URL}): ${err?.message || err}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `PaddleOCR 服务返回错误 ${response.status}: ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();

  // OpenAI format: data.choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("PaddleOCR 返回结果为空");
  }

  // Parse the VLM response into structured blocks
  const rawItems = parseVlmResponse(content);

  const blocks: PaddleOcrBlock[] = rawItems.map((item) => {
    const rect = item.box
      ? boxToRect(item.box)
      : { x: 0, y: 0, width: 0, height: 0 };

    return {
      text: item.text || "",
      confidence: 1.0, // VLM doesn't provide per-block confidence
      ...rect,
    };
  });

  // Build full text and average confidence
  const fullText = blocks.map((b) => b.text).join("\n");

  return {
    text: fullText,
    confidence: 1.0,
    blocks,
  };
}
