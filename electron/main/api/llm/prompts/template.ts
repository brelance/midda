import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

export const resolvePromptFilePath = (opts: {
  moduleUrl: string;
  relativePathFromModuleDir: string;
  fallbackPathFromCwd: string;
  missingMessage: string;
}): string => {
  const candidates = [
    path.resolve(
      path.dirname(fileURLToPath(opts.moduleUrl)),
      opts.relativePathFromModuleDir
    ),
    path.resolve(process.cwd(), opts.fallbackPathFromCwd),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(opts.missingMessage);
};

export const loadPromptTemplate = (opts: {
  moduleUrl: string;
  relativePathFromModuleDir: string;
  fallbackPathFromCwd: string;
  missingMessage: string;
}): string => {
  const filePath = resolvePromptFilePath(opts);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error("[llm] Failed to read prompt template:", filePath, error);
    throw new Error(opts.missingMessage);
  }
};

export const renderTemplate = (
  template: string,
  vars: Record<string, string>
): string => {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    // Avoid String.prototype.replaceAll to keep compatibility with older TS lib targets.
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
};

export const jsonQuote = (value: unknown): string =>
  JSON.stringify(typeof value === "string" ? value : value ?? "");
