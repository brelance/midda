export type EpubErrorCode =
  | "EPUB_FILE_NOT_FOUND"
  | "EPUB_FILE_INVALID"
  | "EPUB_PARSE_FAILED"
  | "EPUB_COVER_NOT_FOUND"
  | "EPUB_STORAGE_FAILED";

export type EpubParseStage =
  | "initializing"
  | "metadata"
  | "cover"
  | "chapters"
  | "finalizing";

export interface EpubErrorPayload {
  code: EpubErrorCode;
  message: string;
  stage?: EpubParseStage;
  cause?: unknown;
}

export class EpubBaseError extends Error {
  public readonly code: EpubErrorCode;
  public readonly stage?: EpubParseStage;
  public readonly cause?: unknown;

  constructor({ code, message, stage, cause }: EpubErrorPayload) {
    super(message);
    this.name = "EpubError";
    this.code = code;
    this.stage = stage;
    this.cause = cause;
  }
}

export class EpubValidationError extends EpubBaseError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "EPUB_FILE_INVALID",
      message,
      stage: "initializing",
      cause,
    });
    this.name = "EpubValidationError";
  }
}

export class EpubParseError extends EpubBaseError {
  constructor(message: string, stage?: EpubParseStage, cause?: unknown) {
    super({
      code: "EPUB_PARSE_FAILED",
      message,
      stage,
      cause,
    });
    this.name = "EpubParseError";
  }
}

export class EpubStorageError extends EpubBaseError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "EPUB_STORAGE_FAILED",
      message,
      stage: "initializing",
      cause,
    });
    this.name = "EpubStorageError";
  }
}

export class EpubCoverError extends EpubBaseError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "EPUB_COVER_NOT_FOUND",
      message,
      stage: "cover",
      cause,
    });
    this.name = "EpubCoverError";
  }
}
