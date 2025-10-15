declare module "say" {
  type SpeakCallback = (error?: Error | null) => void;

  /**
   * Speak the provided text using the system TTS voice.
   *
   * @param text   Sentence or phrase to speak
   * @param voice  Optional voice identifier (platform specific)
   * @param speed  Playback speed multiplier; defaults to 1.0
   * @param callback Invoked once speech finishes or errors
   */
  export function speak(
    text: string,
    voice?: string | null,
    speed?: number | null,
    callback?: SpeakCallback
  ): void;

  /**
   * Stop any active speech immediately.
   *
   * @param callback Invoked once the speech engine has stopped
   */
  export function stop(callback?: () => void): void;
}
