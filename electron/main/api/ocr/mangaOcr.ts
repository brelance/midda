/**
 * Manga OCR — ONNX-based Japanese manga text recognition.
 *
 * Uses manga-ocr-base model (ViT encoder + GPT-2 decoder) exported to ONNX.
 * Models are downloaded from HuggingFace on first use (~140MB total).
 *
 * Architecture:
 *   1. Preprocess image → [1, 3, 224, 224] float32 tensor
 *   2. Encoder: image tensor → encoder hidden states
 *   3. Decoder: greedy autoregressive decoding → token IDs
 *   4. Detokenize → Japanese text
 */

import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import { app } from "electron";
import https from "node:https";
import http from "node:http";

// ── Constants ────────────────────────────────────────────────────────────────

const MODEL_REPO = "l0wgear/manga-ocr-2025-onnx";
const HF_BASE = `https://huggingface.co/${MODEL_REPO}/resolve/main`;

const MODEL_FILES = [
  { name: "encoder_model.onnx", size: "22 MB" },
  { name: "decoder_model.onnx", size: "118 MB" },
  { name: "vocab.txt", size: "24 KB" },
  { name: "generation_config.json", size: "231 B" },
];

// Image preprocessing constants (TrOCR / ViT defaults)
const IMAGE_SIZE = 224;
const MEAN = [0.5, 0.5, 0.5];
const STD = [0.5, 0.5, 0.5];

// Special tokens (from generation_config.json)
let BOS_TOKEN_ID = 2; // decoder_start_token_id
let EOS_TOKEN_ID = 3; // eos_token_id
const MAX_NEW_TOKENS = 300;

// ── Types ────────────────────────────────────────────────────────────────────

export interface MangaOcrResult {
  text: string;
  confidence: number;
}

// ── Model directory ──────────────────────────────────────────────────────────

function getModelDir(): string {
  return path.join(app.getPath("userData"), "models", "manga-ocr");
}

// ── Download helpers ─────────────────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const destTmp = dest + ".tmp";
    const file = createWriteStream(destTmp);
    const doRequest = (requestUrl: string) => {
      const client = requestUrl.startsWith("https") ? https : http;
      client
        .get(requestUrl, (response) => {
          // Follow redirects
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            doRequest(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlink(dest).catch(() => {});
            reject(new Error(`HTTP ${response.statusCode} downloading ${url}`));
            return;
          }

          response.pipe(file);
          file.on("finish", () => {
            file.close();
            // Rename from .tmp to final path (atomic download)
            fs.rename(destTmp, dest).then(resolve).catch(reject);
          });
        })
        .on("error", (err) => {
          file.close();
          fs.unlink(destTmp).catch(() => {});
          reject(err);
        });
    };
    doRequest(url);
  });
}

/**
 * Check if a model file exists locally.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ── Generation config (dynamic token IDs) ────────────────────────────────────

let configLoaded = false;

async function loadGenerationConfig(modelDir: string): Promise<void> {
  if (configLoaded) return;
  try {
    const configPath = path.join(modelDir, "generation_config.json");
    const raw = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (typeof config.decoder_start_token_id === "number") {
      BOS_TOKEN_ID = config.decoder_start_token_id;
    }
    if (typeof config.eos_token_id === "number") {
      EOS_TOKEN_ID = config.eos_token_id;
    }
    console.log(`[mangaOcr] Token IDs: BOS=${BOS_TOKEN_ID}, EOS=${EOS_TOKEN_ID}`);
  } catch {
    console.warn("[mangaOcr] generation_config.json not found, using defaults");
  }
  configLoaded = true;
}

// ── Vocabulary ───────────────────────────────────────────────────────────────

let vocabMap: string[] | null = null;

async function loadVocab(modelDir: string): Promise<string[]> {
  if (vocabMap) return vocabMap;
  const vocabPath = path.join(modelDir, "vocab.txt");
  const content = await fs.readFile(vocabPath, "utf-8");
  vocabMap = content.split("\n");
  return vocabMap;
}

function decodeTokenIds(tokenIds: number[], vocab: string[]): string {
  const tokens: string[] = [];
  for (const id of tokenIds) {
    if (id === BOS_TOKEN_ID || id === EOS_TOKEN_ID) continue;
    if (id >= 0 && id < vocab.length) {
      const token = vocab[id];
      // Skip special tokens
      if (token.startsWith("[") && token.endsWith("]")) continue;
      // Handle ##prefix (WordPiece)
      if (token.startsWith("##")) {
        tokens.push(token.slice(2));
      } else {
        tokens.push(token);
      }
    }
  }
  return tokens.join("").replace(/\s+/g, "");
}

// ── Image preprocessing (using sharp) ────────────────────────────────────────

async function preprocessImage(
  imageInput: string
): Promise<Float32Array> {
  const sharp = (await import("sharp")).default;

  let inputBuffer: Buffer;
  if (imageInput.startsWith("data:")) {
    const base64Data = imageInput.split(",")[1];
    if (!base64Data) throw new Error("无效的 data URL");
    inputBuffer = Buffer.from(base64Data, "base64");
  } else {
    inputBuffer = await fs.readFile(imageInput) as Buffer;
  }

  // Resize to 224x224 and convert to raw RGB float
  const { data, info } = await sharp(inputBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // data is HWC uint8, convert to CHW float32 with normalization
  const numPixels = info.width * info.height;
  const floatData = new Float32Array(3 * numPixels);

  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 3] / 255.0;
    const g = data[i * 3 + 1] / 255.0;
    const b = data[i * 3 + 2] / 255.0;

    // CHW layout, normalized
    floatData[0 * numPixels + i] = (r - MEAN[0]) / STD[0];
    floatData[1 * numPixels + i] = (g - MEAN[1]) / STD[1];
    floatData[2 * numPixels + i] = (b - MEAN[2]) / STD[2];
  }

  return floatData;
}

// ── ONNX Runtime sessions ────────────────────────────────────────────────────

let encoderSession: any = null;
let decoderSession: any = null;
let ort: typeof import("onnxruntime-node") | null = null;

async function getOrt(): Promise<typeof import("onnxruntime-node")> {
  if (ort) return ort;
  ort = await import("onnxruntime-node");
  return ort;
}

async function ensureSessions(modelDir: string): Promise<void> {
  if (encoderSession && decoderSession) return;

  const ortModule = await getOrt();

  const encoderPath = path.join(modelDir, "encoder_model.onnx");
  const decoderPath = path.join(modelDir, "decoder_model.onnx");

  console.log("[mangaOcr] Loading encoder...");
  encoderSession = await ortModule.InferenceSession.create(encoderPath, {
    executionProviders: ["cpu"],
  });

  console.log("[mangaOcr] Loading decoder...");
  decoderSession = await ortModule.InferenceSession.create(decoderPath, {
    executionProviders: ["cpu"],
  });

  console.log("[mangaOcr] Models loaded successfully");
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if manga-ocr models are downloaded and ready.
 */
export async function isMangaOcrReady(): Promise<boolean> {
  const modelDir = getModelDir();
  for (const file of MODEL_FILES) {
    if (!(await fileExists(path.join(modelDir, file.name)))) return false;
  }
  return true;
}

/**
 * Get the status of model downloads.
 */
export async function getMangaOcrStatus(): Promise<{
  ready: boolean;
  downloaded: string[];
  missing: string[];
}> {
  const modelDir = getModelDir();
  const downloaded: string[] = [];
  const missing: string[] = [];

  for (const file of MODEL_FILES) {
    if (await fileExists(path.join(modelDir, file.name))) {
      downloaded.push(file.name);
    } else {
      missing.push(`${file.name} (${file.size})`);
    }
  }

  return { ready: missing.length === 0, downloaded, missing };
}

/**
 * Download manga-ocr models from HuggingFace.
 * Emits progress via callback.
 */
export async function downloadMangaOcrModels(
  onProgress?: (file: string, current: number, total: number) => void
): Promise<void> {
  const modelDir = getModelDir();
  await fs.mkdir(modelDir, { recursive: true });

  const total = MODEL_FILES.length;
  for (let i = 0; i < total; i++) {
    const file = MODEL_FILES[i];
    const dest = path.join(modelDir, file.name);

    if (await fileExists(dest)) {
      console.log(`[mangaOcr] ${file.name} already exists, skipping`);
      onProgress?.(file.name, i + 1, total);
      continue;
    }

    console.log(`[mangaOcr] Downloading ${file.name} (${file.size})...`);
    onProgress?.(file.name, i, total);

    const url = `${HF_BASE}/${file.name}`;
    await downloadFile(url, dest);

    console.log(`[mangaOcr] Downloaded ${file.name}`);
    onProgress?.(file.name, i + 1, total);
  }
}

/**
 * Perform manga OCR on an image.
 *
 * @param imageInput - File path or data URL
 * @returns Recognized text
 */
export async function recognizeMangaText(
  imageInput: string
): Promise<MangaOcrResult> {
  const ortModule = await getOrt();
  const modelDir = getModelDir();

  // Ensure models are downloaded
  if (!(await isMangaOcrReady())) {
    throw new Error(
      "manga-ocr 模型尚未下载。请先调用 downloadMangaOcrModels()。"
    );
  }

  // Load config (token IDs) + sessions + vocab
  await loadGenerationConfig(modelDir);
  await ensureSessions(modelDir);

  // Load vocab
  const vocab = await loadVocab(modelDir);

  // 1. Preprocess image → [1, 3, 224, 224]
  const imageData = await preprocessImage(imageInput);
  const inputTensor = new ortModule.Tensor("float32", imageData, [
    1,
    3,
    IMAGE_SIZE,
    IMAGE_SIZE,
  ]);

  // 2. Run encoder
  const encoderOutput = await encoderSession.run({
    pixel_values: inputTensor,
  });

  // Get encoder hidden states (the key varies, find the first tensor output)
  const encoderHiddenStatesKey =
    Object.keys(encoderOutput).find((k) => k.includes("last_hidden_state")) ||
    Object.keys(encoderOutput)[0];
  const encoderHiddenStates = encoderOutput[encoderHiddenStatesKey];

  // 3. Greedy decoding
  const generatedIds: number[] = [BOS_TOKEN_ID];

  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const inputIds = new ortModule.Tensor(
      "int64",
      BigInt64Array.from(generatedIds.map(BigInt)),
      [1, generatedIds.length]
    );

    // Build decoder feeds
    const decoderFeeds: Record<string, any> = {
      input_ids: inputIds,
      encoder_hidden_states: encoderHiddenStates,
    };

    // Some decoder models also need encoder_attention_mask
    if (decoderSession.inputNames.includes("encoder_attention_mask")) {
      const seqLen = encoderHiddenStates.dims[1];
      const mask = new ortModule.Tensor(
        "int64",
        BigInt64Array.from(new Array(seqLen).fill(1n)),
        [1, seqLen]
      );
      decoderFeeds["encoder_attention_mask"] = mask;
    }

    const decoderOutput = await decoderSession.run(decoderFeeds);

    // Get logits
    const logitsKey =
      Object.keys(decoderOutput).find((k) => k.includes("logits")) ||
      Object.keys(decoderOutput)[0];
    const logits = decoderOutput[logitsKey];

    // Get last token logits
    const vocabSize = logits.dims[logits.dims.length - 1];
    const lastTokenOffset = (generatedIds.length - 1) * vocabSize;
    const logitsData = logits.data as Float32Array;

    // Argmax for greedy decoding
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < vocabSize; i++) {
      const val = logitsData[lastTokenOffset + i];
      if (val > maxVal) {
        maxVal = val;
        maxIdx = i;
      }
    }

    generatedIds.push(maxIdx);

    // Stop at EOS
    if (maxIdx === EOS_TOKEN_ID) break;
  }

  // 4. Decode tokens to text
  const text = decodeTokenIds(generatedIds, vocab);

  return {
    text,
    confidence: 1.0, // Greedy decoding doesn't provide confidence
  };
}
