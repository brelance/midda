import { ipcMain, IpcMainInvokeEvent } from "electron";
import { proxyFetch as fetch } from "../../utils/proxy";
import {
  GeminiNonStreamResponse,
  TokenData,
} from "../../../../src/types/types";
const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";

export function setupGeminiApiHandler(): void {
  // 使用 ipcMain.handle
  ipcMain.handle(
    "gemini-tokens-request",
    async (
      _event: IpcMainInvokeEvent,
      { prompt }: { prompt: string }
    ): Promise<TokenData[]> => {
      if (!API_KEY) {
        throw new Error("API_KEY is not defined in environment variables.");
      }

      try {
        const payload = {
          model: MODEL_NAME,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Gemini API Error:", errorText);
          throw new Error(`API请求失败: ${response.status} ${errorText}`);
        }

        const result = (await response.json()) as GeminiNonStreamResponse;
        let text = result.choices?.[0]?.message?.content;

        if (text) {
          text = text.replace(/```json\n?|\n?```/g, "").trim();
          try {
            const tokens = JSON.parse(text) as TokenData[];
            if (tokens.length > 0) {
              return tokens; // 直接返回结果
            } else {
              throw new Error("Non-streaming response contained no tokens.");
            }
          } catch (parseError) {
            console.error("Error parsing tokens:", parseError);
            throw new Error(
              `Failed to parse tokens from response: ${
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError)
              }`
            );
          }
        } else {
          throw new Error(
            "Non-streaming response did not contain expected content."
          );
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        // 抛出错误，ipcRenderer.invoke 会捕获到这个 rejection
        throw error;
      }
    }
  );
}
