import { app, ipcMain, type WebContents } from "electron";
import { TtsController } from "./TtsController";
import { EdgeTtsEngine } from "./EdgeTtsEngine";
import type {
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
} from "../../../../src/types/tts";

interface TtsStartPayload extends TtsStartRequestOptions {
  sentences: TtsSentencePayload[];
}

interface JumpPayload {
  index: number;
}

const watchSet = new Set<WebContents>();

const registerWatcher = (contents: WebContents): void => {
  if (watchSet.has(contents)) {
    return;
  }

  watchSet.add(contents);
  contents.once("destroyed", () => {
    watchSet.delete(contents);
  });
};

const broadcastState = (state: TtsStateUpdate): void => {
  for (const contents of watchSet) {
    if (contents.isDestroyed()) {
      watchSet.delete(contents);
      continue;
    }

    contents.send("tts:state", state);
  }
};

const normalizeStartPayload = (payload: unknown): TtsStartPayload => {
  if (!payload || typeof payload !== "object") {
    throw new Error("缺少 TTS 播放参数");
  }

  const candidate = payload as Partial<TtsStartPayload>;

  if (!Array.isArray(candidate.sentences)) {
    throw new Error("TTS sentences 必须是数组");
  }

  const sentences = candidate.sentences
    .filter(
      (item): item is TtsSentencePayload =>
        Boolean(item) &&
        typeof (item as TtsSentencePayload).id === "string" &&
        typeof (item as TtsSentencePayload).text === "string"
    )
    .map((item) => ({ id: item.id, text: item.text }));

  if (sentences.length === 0) {
    throw new Error("未提供可朗读的句子");
  }

  const startIndex =
    typeof candidate.startIndex === "number" && Number.isFinite(candidate.startIndex)
      ? candidate.startIndex
      : undefined;
  const voice =
    typeof candidate.voice === "string" && candidate.voice.trim().length > 0
      ? candidate.voice.trim()
      : undefined;
  const rate =
    typeof candidate.rate === "number" && Number.isFinite(candidate.rate)
      ? candidate.rate
      : undefined;
  const language =
    typeof candidate.language === "string" && candidate.language.trim().length > 0
      ? candidate.language.trim()
      : undefined;
  const engine =
    candidate.engine === "edge" || candidate.engine === "system"
      ? candidate.engine
      : undefined;

  return { sentences, startIndex, voice, rate, language, engine };
};

const normalizeJumpPayload = (payload: unknown): number => {
  const candidate = payload as Partial<JumpPayload> | number;
  if (typeof candidate === "number" && Number.isInteger(candidate)) {
    return candidate;
  }

  if (
    candidate &&
    typeof (candidate as Partial<JumpPayload>).index === "number" &&
    Number.isInteger((candidate as Partial<JumpPayload>).index)
  ) {
    return (candidate as Partial<JumpPayload>).index as number;
  }

  throw new Error("jumpTo 需要有效的句子索引");
};

export const setupTtsApiHandler = (): void => {
  const controller = new TtsController();

  controller.on("state", (state) => {
    broadcastState(state);
  });

  controller.on("error", (error) => {
    const stateWithError: TtsStateUpdate = {
      ...controller.getState(),
      error: error.message,
    };
    broadcastState(stateWithError);
  });

  const handleIpcError = (error: unknown) => {
    console.error("[tts] IPC 调用失败:", error);
    const fallback = error instanceof Error ? error : new Error(String(error));
    const stateWithError: TtsStateUpdate = {
      ...controller.getState(),
      error: fallback.message,
    };
    broadcastState(stateWithError);
  };

  ipcMain.handle("tts:subscribe", async (event) => {
    registerWatcher(event.sender);
    return controller.getState();
  });

  ipcMain.handle("tts:start", async (event, rawPayload: unknown) => {
    try {
      registerWatcher(event.sender);
      const payload = normalizeStartPayload(rawPayload);
      controller.start(payload.sentences, payload);
      return controller.getState();
    } catch (error) {
      handleIpcError(error);
      throw error;
    }
  });

  ipcMain.handle("tts:pause", async (event) => {
    registerWatcher(event.sender);
    controller.pause();
    return controller.getState();
  });

  ipcMain.handle("tts:resume", async (event) => {
    registerWatcher(event.sender);
    controller.resume();
    return controller.getState();
  });

  ipcMain.handle("tts:stop", async (event) => {
    registerWatcher(event.sender);
    controller.stop();
    return controller.getState();
  });

  ipcMain.handle("tts:jump-to", async (event, rawPayload: unknown) => {
    try {
      registerWatcher(event.sender);
      const index = normalizeJumpPayload(rawPayload);
      controller.jumpTo(index);
      return controller.getState();
    } catch (error) {
      handleIpcError(error);
      throw error;
    }
  });

  // ── Edge TTS specific ─────────────────────────────────────────────────

  let _edgeEngine: EdgeTtsEngine | null = null;
  const getEdgeEngine = () => {
    if (!_edgeEngine) {
      _edgeEngine = new EdgeTtsEngine();
    }
    return _edgeEngine;
  };

  ipcMain.handle("tts:list-voices", async (_event, language?: string) => {
    try {
      const engine = getEdgeEngine();
      return await engine.listVoices(language);
    } catch (error) {
      console.error("[tts] listVoices failed:", error);
      return [];
    }
  });

  ipcMain.handle("tts:set-engine", async (_event, engine: string) => {
    if (engine === "edge" || engine === "system") {
      controller.setEngine(engine);
    }
  });

  app.on("before-quit", () => {
    controller.dispose();
  });
};

