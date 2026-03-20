/**
 * Edge TTS Engine — wraps `edge-tts-universal` to synthesise speech via
 * Microsoft's neural TTS service (the same voices used by Edge's "Read Aloud").
 *
 * This is a **free, unofficial** API.  It requires network connectivity.
 * The caller should catch errors and fall back to the system TTS (`say`).
 */

// ── Public types ────────────────────────────────────────────────────────────

export interface EdgeTtsVoice {
  name: string;
  locale: string;
  gender: string;
}

export interface EdgeTtsSynthesisResult {
  /** Raw MP3 audio data */
  audioBuffer: Buffer;
}

// ── Default voice map (language → preferred neural voice) ───────────────────

const DEFAULT_VOICES: Record<string, string> = {
  "ja-JP": "ja-JP-NanamiNeural",
  "en-US": "en-US-JennyNeural",
  "en-GB": "en-GB-SoniaNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "zh-TW": "zh-TW-HsiaoChenNeural",
  "ko-KR": "ko-KR-SunHiNeural",
  "fr-FR": "fr-FR-DeniseNeural",
  "de-DE": "de-DE-KatjaNeural",
  "es-ES": "es-ES-ElviraNeural",
};

/**
 * Resolve the best voice name for a given language tag.
 * Falls back to `ja-JP-NanamiNeural` if no mapping exists.
 */
const resolveVoice = (voice?: string, language?: string): string => {
  if (voice) return voice;
  if (language) {
    // Try exact match first, then two-letter prefix
    if (DEFAULT_VOICES[language]) return DEFAULT_VOICES[language];
    const prefix = language.split("-")[0]?.toLowerCase();
    for (const [locale, v] of Object.entries(DEFAULT_VOICES)) {
      if (locale.toLowerCase().startsWith(prefix ?? "")) return v;
    }
  }
  return DEFAULT_VOICES["ja-JP"];
};

// ── Lazy module loader (ESM-friendly) ───────────────────────────────────────

let _edgeTtsModule: any = null;

async function loadEdgeTts(): Promise<any> {
  if (!_edgeTtsModule) {
    _edgeTtsModule = await import("edge-tts-universal");
  }
  return _edgeTtsModule;
}

// ── Engine class ────────────────────────────────────────────────────────────

export class EdgeTtsEngine {
  /**
   * Synthesise `text` → MP3 Buffer using Edge TTS.
   *
   * @throws if network is unavailable or the service returns an error.
   */
  async synthesize(
    text: string,
    options?: { voice?: string; rate?: number; language?: string }
  ): Promise<EdgeTtsSynthesisResult> {
    const mod = await loadEdgeTts();
    const Communicate = mod.Communicate ?? mod.default?.Communicate;
    const voiceName = resolveVoice(options?.voice, options?.language);

    // edge-tts-universal rate format: "+0%", "+50%", "-20%" etc.
    const ratePercent =
      options?.rate != null
        ? Math.round((options.rate - 1) * 100)
        : 0;
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    const communicate = new Communicate(text, {
      voice: voiceName,
      rate: rateStr,
    });

    const chunks: Buffer[] = [];

    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        chunks.push(Buffer.from(chunk.data));
      }
    }

    if (chunks.length === 0) {
      throw new Error("Edge TTS returned no audio data");
    }

    return { audioBuffer: Buffer.concat(chunks) };
  }

  /**
   * List available Edge TTS voices, optionally filtered by language.
   */
  async listVoices(language?: string): Promise<EdgeTtsVoice[]> {
    const mod = await loadEdgeTts();
    const listVoicesFn = mod.listVoices ?? mod.default?.listVoices;
    const allVoices = await listVoicesFn();

    const mapped = allVoices.map((v: any) => ({
      name: v.ShortName ?? v.Name ?? "",
      locale: v.Locale ?? "",
      gender: v.Gender ?? "",
    }));

    if (!language) return mapped;

    const prefix = language.toLowerCase();
    return mapped.filter(
      (v: EdgeTtsVoice) =>
        v.locale.toLowerCase() === prefix ||
        v.locale.toLowerCase().startsWith(prefix.split("-")[0] ?? "")
    );
  }
}

