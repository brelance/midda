import { ipcMain, BrowserWindow } from "electron";

import { proxyFetch as fetch } from "../../../utils/proxy";
import { GeminiNonStreamResponse } from "../../../../../src/types/types";

const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";

export function setupWordDetailApiHandler(): void {
  ipcMain.on(
    "word-detail-request",
    async (
      event,
      {
        word,
        pos,
        sentence,
        furigana,
        romaji,
      }: {
        word: string;
        pos: string;
        sentence: string;
        furigana: string;
        romaji: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(
        event.sender
      ) as BrowserWindow;
      if (!window) return;

      const sendError = (message: string) => {
        event.sender.send("word-detail-error", message);
      };

      if (!API_KEY) {
        sendError("API_KEY is not defined in environment variables.");
        return;
      }

      try {
        if (!word || !pos || !sentence) {
          sendError("缺少必要的参数");
          return;
        }

        let contextWordInfo = `单词 "${word}" (词性: ${pos}`;
        if (furigana) contextWordInfo += `, 读音: ${furigana}`;
        if (romaji) contextWordInfo += `, 罗马音: ${romaji}`;
        contextWordInfo += `)`;

        const detailPrompt = `在日语句子 "${sentence}" 的上下文中，${contextWordInfo} 的具体含义是什么？请提供以下信息，并以严格的JSON对象格式返回，不要包含任何markdown或其他非JSON字符：

请特别注意：
1. 如果是动词，准确识别其时态（过去式、现在式等）、语态（被动、使役等）和礼貌程度（简体、敬体等）
2. 对于助动词与动词组合（如"食べた"），明确说明原形及活用变化过程
3. 对于形容词，注意区分い形容词和な形容词，并识别其活用形式
4. 准确提供辞书形，对于已经是辞书形的词汇，可以填写相同的值

{
  "originalWord": "${word}",
  "chineseTranslation": "中文翻译",
  "pos": "${pos}",
  "furigana": "${furigana || ""}",
  "romaji": "${romaji || ""}",
  "dictionaryForm": "辞书形（如果适用）",
  "explanation": "中文解释（包括词形变化、时态、语态等详细语法信息）"
}`;
        const payload = {
          model: MODEL_NAME,
          reasoning_effort: "none",
          messages: [{ role: "user", content: detailPrompt }],
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
          const errorData = await response.json().catch(() => null);
          console.error(
            "AI API error (Word Detail):",
            errorData || "响应体不是有效的JSON"
          );
          const errorMessage =
            (errorData as any)?.error?.message || "处理请求时出错"; // Explicitly cast to any
          sendError(errorMessage);
          return;
        }

        const data = (await response.json()) as GeminiNonStreamResponse;
        console.log("Received word-detail-response:", data);

        try {
          const jsonString = data.choices[0].message.content
            .replace(/```json\n|```/g, "")
            .trim();
          const wordDetail = JSON.parse(jsonString);
          window.webContents.send("word-detail-response", wordDetail);
        } catch (parseError) {
          console.error("Failed to parse word detail JSON:", parseError);
          sendError("Failed to parse word detail from AI response.");
        }
      } catch (error: unknown) {
        console.error("Server error (Word Detail):", error);
        const errorMessage =
          error instanceof Error ? error.message : "Internal Server Error";
        sendError(errorMessage);
      }
    }
  );
}
