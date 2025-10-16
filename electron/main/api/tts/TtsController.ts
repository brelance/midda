import { EventEmitter } from "node:events";
import say from "say";
import type {
  TtsPlaybackStatus,
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
} from "../../../../src/types/tts";

const DEFAULT_RATE = 1;
type PlatformKey = NodeJS.Platform | "default";

const LANGUAGE_VOICE_MAP: Record<string, Partial<Record<PlatformKey, string>>> = {
  "ja-JP": {
    darwin: "Kyoko",
    win32: "Microsoft Haruka Desktop",
    linux: "ja",
  },
  "en-US": {
    darwin: "Samantha",
    win32: "Microsoft Zira Desktop",
    linux: "en",
  },
};

const resolveVoiceForLanguage = (language?: string): string | undefined => {
  if (!language) {
    return undefined;
  }

  const mapping = LANGUAGE_VOICE_MAP[language];
  if (!mapping) {
    return undefined;
  }

  return mapping[process.platform as PlatformKey] ?? mapping.default;
};

export class TtsController extends EventEmitter {
  private queue: TtsSentencePayload[] = [];

  private currentIndex: number | null = null;

  private status: TtsPlaybackStatus = "idle";

  private voice: string | undefined;

  private rate = DEFAULT_RATE;

  private playbackToken = 0;

  start(sentences: TtsSentencePayload[], options?: TtsStartRequestOptions): void {
    this.stopSpeech();

    this.queue = Array.isArray(sentences) ? [...sentences] : [];
    const resolvedVoice =
      options?.voice ?? resolveVoiceForLanguage(options?.language);
    this.voice = resolvedVoice;
    this.rate = options?.rate ?? DEFAULT_RATE;

    if (this.queue.length === 0) {
      this.resetProgress();
      this.emitState();
      return;
    }

    const startIndex = this.clampIndex(options?.startIndex ?? 0);
    this.playFromIndex(startIndex);
  }

  pause(): void {
    if (this.status !== "playing") {
      return;
    }

    this.stopSpeech(false);
    this.status = "paused";
    this.emitState();
  }

  resume(): void {
    if (this.status !== "paused") {
      return;
    }

    const index = this.currentIndex ?? 0;
    this.playFromIndex(this.clampIndex(index));
  }

  stop(): void {
    if (this.status === "idle" && this.queue.length === 0) {
      return;
    }

    this.stopSpeech();
    this.queue = [];
    this.resetProgress();
    this.status = "idle";
    this.emitState();
  }

  jumpTo(index: number): void {
    if (!Number.isInteger(index) || this.queue.length === 0) {
      return;
    }

    const targetIndex = this.clampIndex(index);
    this.stopSpeech(false);
    this.playFromIndex(targetIndex);
  }

  dispose(): void {
    this.stop();
  }

  getState(): TtsStateUpdate {
    return {
      status: this.status,
      currentIndex: this.currentIndex,
      currentSentenceId:
        this.currentIndex != null ? this.queue[this.currentIndex]?.id ?? null : null,
      queueLength: this.queue.length,
    };
  }

  private clampIndex(index: number): number {
    if (this.queue.length === 0) {
      return 0;
    }
    if (index < 0) {
      return 0;
    }
    if (index >= this.queue.length) {
      return this.queue.length - 1;
    }
    return index;
  }

  private playFromIndex(index: number): void {
    const sentence = this.queue[index];
    if (!sentence) {
      this.finishPlayback();
      return;
    }

    this.currentIndex = index;
    this.status = "playing";
    const token = ++this.playbackToken;
    this.emitState();

    try {
      say.speak(sentence.text, this.voice ?? undefined, this.rate, (error) => {
        if (token !== this.playbackToken) {
          return;
        }

        if (error) {
          this.handlePlaybackError(error);
          return;
        }

        const nextIndex = index + 1;
        if (nextIndex >= this.queue.length) {
          this.finishPlayback();
        } else {
          this.playFromIndex(nextIndex);
        }
      });
    } catch (error) {
      this.handlePlaybackError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private finishPlayback(): void {
    this.stopSpeech();
    this.status = "idle";
    this.resetProgress();
    this.emitState();
  }

  private handlePlaybackError(error: Error): void {
    this.stopSpeech(false);
    this.status = "idle";
    this.emitState({ error: error.message });
    this.emit("error", error);
  }

  private stopSpeech(resetIndex = true): void {
    this.playbackToken += 1;
    try {
      say.stop();
    } catch (error) {
      // 忽略底层语音库的停止异常，保持控制器状态一致
      console.warn("TTS stop failed:", error);
    }

    if (resetIndex) {
      this.resetProgress();
    }
  }

  private resetProgress(): void {
    this.currentIndex = null;
  }

  private emitState(extra?: Partial<TtsStateUpdate>): void {
    const state = {
      ...this.getState(),
      ...extra,
    };
    this.emit("state", state);
  }
}
