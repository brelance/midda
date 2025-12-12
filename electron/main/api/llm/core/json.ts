export const stripMarkdownCodeFences = (input: string): string =>
  input.replace(/```(?:json)?\n?|\n?```/g, "").trim();

export const parseJson = <T>(text: string, context: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: Failed to parse JSON (${message}). Raw: ${text.slice(0, 500)}`);
  }
};

