/**
 * Native OCR provider — bridges to OS-level OCR capabilities.
 *
 * macOS: uses Vision framework via a compiled Swift CLI
 * Windows: placeholder for WinRT OCR (future)
 * Linux: placeholder for tesseract.js fallback (future)
 */

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { app } from "electron";
import path from "node:path";
import os from "node:os";

export interface OcrBlock {
  text: string;
  confidence: number;
  /** x coordinate in image pixels */
  x: number;
  /** y coordinate in image pixels */
  y: number;
  /** Width in image pixels */
  width: number;
  /** Height in image pixels */
  height: number;
}

export interface OcrResult {
  /** The full recognized text */
  text: string;
  /** Individual text blocks with positions */
  blocks: OcrBlock[];
  /** Detected or hinted language */
  language?: string;
}

// ── macOS Vision OCR ───────────────────────────────────────────────────────

/**
 * Path to the compiled Swift OCR binary.
 * In dev: source .swift in electron/main/api/ocr/
 * In production: compiled binary in resources/
 */
function getSwiftScriptPath(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(
      app.getAppPath(),
      "electron",
      "main",
      "api",
      "ocr",
      "ocr_vision.swift"
    );
  }
  // In production, the compiled binary is in extraResources
  return path.join(process.resourcesPath, "ocr_vision");
}

async function runMacOsVisionOcr(
  imagePath: string,
  languageHint?: string
): Promise<OcrResult> {
  const scriptPath = getSwiftScriptPath();

  return new Promise((resolve, reject) => {
    const args: string[] = [];

    // In dev, run via swift interpreter
    const isDev = !app.isPackaged;
    let command: string;
    if (isDev) {
      command = "swift";
      args.push(scriptPath, imagePath);
    } else {
      command = scriptPath;
      args.push(imagePath);
    }

    if (languageHint) {
      args.push(languageHint);
    }

    execFile(
      command,
      args,
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[nativeOcr] OCR execution error:", stderr);
          reject(new Error(`OCR 执行失败: ${error.message}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
          resolve(result as OcrResult);
        } catch (parseErr) {
          console.error("[nativeOcr] Failed to parse OCR output:", stdout);
          reject(new Error("OCR 输出解析失败"));
        }
      }
    );
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Perform OCR on an image using the OS native engine.
 *
 * @param imageInput - Either an absolute file path, or a base64 data URL
 * @param languageHint - Optional ISO language code (e.g., 'ja', 'zh-Hans', 'en')
 */
export async function recognizeText(
  imageInput: string,
  languageHint?: string
): Promise<OcrResult> {
  const platform = os.platform();

  let imagePath: string;
  let tempFile: string | null = null;

  // If input is a data URL, save to temp file
  if (imageInput.startsWith("data:")) {
    const base64Data = imageInput.split(",")[1];
    if (!base64Data) throw new Error("无效的 data URL");

    const ext = imageInput.includes("image/png") ? ".png" : ".jpg";
    tempFile = path.join(os.tmpdir(), `midda_ocr_${Date.now()}${ext}`);
    await fs.writeFile(tempFile, Buffer.from(base64Data, "base64"));
    imagePath = tempFile;
  } else {
    imagePath = imageInput;
  }

  try {
    if (platform === "darwin") {
      return await runMacOsVisionOcr(imagePath, languageHint);
    }

    // Placeholder for other platforms
    if (platform === "win32") {
      throw new Error("Windows OCR 支持即将推出");
    }

    throw new Error(`当前平台 (${platform}) 暂不支持原生 OCR`);
  } finally {
    // Clean up temp file
    if (tempFile) {
      fs.unlink(tempFile).catch(() => {});
    }
  }
}

/**
 * Check if native OCR is available on the current platform.
 */
export function isNativeOcrAvailable(): boolean {
  return os.platform() === "darwin";
}
