import { EventEmitter } from "node:events";
import { exec } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import say from "say";
import { EdgeTtsEngine } from "./EdgeTtsEngine";
import type {
  TtsEngine,
  TtsPlaybackStatus,
  TtsSentencePayload,
  TtsStartRequestOptions,
  TtsStateUpdate,
} from "../../../../src/types/tts";

const DEFAULT_RATE = 1;
type PlatformKey = NodeJS.Platform | "default";

/** System TTS voice map (used only when engine = "system") */
const SYSTEM_VOICE_MAP: Record<string, Partial<Record<PlatformKey, string>>> = {
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

const resolveSystemVoice = (language?: string): string | undefined => {
  if (!language) return undefined;
  const mapping = SYSTEM_VOICE_MAP[language];
  if (!mapping) return undefined;
  return mapping[process.platform as PlatformKey] ?? mapping.default;
};

/**
 * Play an MP3 buffer using the platform's native audio player.
 * Returns a promise that resolves when playback finishes.
 * The returned `abort` function kills the player process immediately.
 */
const playMp3Buffer = (
  buffer: Buffer,
  token: number,
  getToken: () => number
): { promise: Promise<void>; abort: () => void } => {
  const tmpFile = path.join(
    os.tmpdir(),
    `midda-tts-${Date.now()}-${token}.mp3`
  );

  let childProcess: ReturnType<typeof exec> | null = null;

  const abort = () => {
    if (childProcess && !childProcess.killed) {
      childProcess.kill("SIGKILL");
    }
    unlink(tmpFile).catch(() => {});
  };

  const promise = (async () => {
    await writeFile(tmpFile, buffer);

    if (getToken() !== token) {
      await unlink(tmpFile).catch(() => {});
      return;
    }

    const command =
      process.platform === "darwin"
        ? `afplay "${tmpFile}"`
        : process.platform === "win32"
          ? `powershell -c "Add-Type -AssemblyName presentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([uri]'${tmpFile}'); $p.Play(); Start-Sleep -Milliseconds 500; while($p.Position -lt $p.NaturalDuration.TimeSpan){ Start-Sleep -Milliseconds 100 }; $p.Close()"`
          : `mpv --no-terminal "${tmpFile}" 2>/dev/null || ffplay -nodisp -autoexit "${tmpFile}" 2>/dev/null || paplay "${tmpFile}"`;

    await new Promise<void>((resolve, reject) => {
      childProcess = exec(command, (error) => {
        childProcess = null;
        if (getToken() !== token) {
          resolve();
          return;
        }
        if (error) {
          // If killed, treat as normal stop
          if ((error as any).killed || (error as any).signal === "SIGKILL") {
            resolve();
          } else {
            reject(error);
          }
        } else {
          resolve();
        }
      });
    });

    await unlink(tmpFile).catch(() => {});
  })();

  return { promise, abort };
};

export class TtsController extends EventEmitter {
  private queue: TtsSentencePayload[] = [];
  private currentIndex: number | null = null;
  private status: TtsPlaybackStatus = "idle";
  private voice: string | undefined;
  private rate = DEFAULT_RATE;
  private language: string | undefined;
  private playbackToken = 0;
  private engine: TtsEngine = "edge";
  private edgeEngine = new EdgeTtsEngine();
  private abortCurrentPlayback: (() => void) | null = null;

  setEngine(engine: TtsEngine): void {
    this.engine = engine;
    console.log(`[TTS] Engine set to: ${engine}`);
  }

  getEngine(): TtsEngine {
    return this.engine;
  }

  start(
    sentences: TtsSentencePayload[],
    options?: TtsStartRequestOptions
  ): void {
    this.stopSpeech();

    this.queue = Array.isArray(sentences) ? [...sentences] : [];
    this.language = options?.language;

    if (options?.engine) {
      this.engine = options.engine;
    }

    // For system engine, resolve a system voice
    if (this.engine === "system") {
      this.voice =
        options?.voice ?? resolveSystemVoice(options?.language);
    } else {
      // Edge engine handles voice resolution internally
      this.voice = options?.voice;
    }

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
    if (this.status !== "playing") return;
    this.stopSpeech(false);
    this.status = "paused";
    this.emitState();
  }

  resume(): void {
    if (this.status !== "paused") return;
    const index = this.currentIndex ?? 0;
    this.playFromIndex(this.clampIndex(index));
  }

  stop(): void {
    if (this.status === "idle" && this.queue.length === 0) return;
    this.stopSpeech();
    this.queue = [];
    this.resetProgress();
    this.status = "idle";
    this.emitState();
  }

  jumpTo(index: number): void {
    if (!Number.isInteger(index) || this.queue.length === 0) return;
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
        this.currentIndex != null
          ? this.queue[this.currentIndex]?.id ?? null
          : null,
      queueLength: this.queue.length,
      engine: this.engine,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private clampIndex(index: number): number {
    if (this.queue.length === 0) return 0;
    if (index < 0) return 0;
    if (index >= this.queue.length) return this.queue.length - 1;
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

    if (this.engine === "edge") {
      this.playViaEdge(sentence, index, token);
    } else {
      this.playViaSystem(sentence, index, token);
    }
  }

  /** Try Edge TTS; fall back to system TTS on failure. */
  private playViaEdge(
    sentence: TtsSentencePayload,
    index: number,
    token: number
  ): void {
    void (async () => {
      try {
        const result = await this.edgeEngine.synthesize(sentence.text, {
          voice: this.voice,
          rate: this.rate,
          language: this.language,
        });

        if (token !== this.playbackToken) return;

        const { promise, abort } = playMp3Buffer(
          result.audioBuffer,
          token,
          () => this.playbackToken
        );
        this.abortCurrentPlayback = abort;

        await promise;
        this.abortCurrentPlayback = null;

        if (token !== this.playbackToken) return;

        this.advanceToNext(index);
      } catch (error) {
        if (token !== this.playbackToken) return;

        console.warn(
          "[TTS] Edge TTS failed, falling back to system TTS:",
          error
        );
        // Fall back to system TTS for this sentence
        this.playViaSystem(sentence, index, token);
      }
    })();
  }

  private playViaSystem(
    sentence: TtsSentencePayload,
    index: number,
    token: number
  ): void {
    const systemVoice =
      this.engine === "system"
        ? this.voice
        : resolveSystemVoice(this.language);

    try {
      say.speak(
        sentence.text,
        systemVoice ?? undefined,
        this.rate,
        (error) => {
          if (token !== this.playbackToken) return;

          if (error) {
            const err = error as unknown;
            this.handlePlaybackError(
              err instanceof Error ? err : new Error(String(err))
            );
            return;
          }

          this.advanceToNext(index);
        }
      );
    } catch (error) {
      this.handlePlaybackError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private advanceToNext(currentIndex: number): void {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= this.queue.length) {
      this.finishPlayback();
    } else {
      this.playFromIndex(nextIndex);
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

    // Abort any Edge TTS MP3 playback
    if (this.abortCurrentPlayback) {
      this.abortCurrentPlayback();
      this.abortCurrentPlayback = null;
    }

    // Stop system TTS
    try {
      say.stop();
    } catch (error) {
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
