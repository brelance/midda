import { ipcMain, BrowserWindow } from "electron";
import { GeminiNonStreamResponse } from "../../../../../src/types/types";
import { proxyFetch as fetch } from "../../../utils/proxy";

const API_KEY: string | undefined = process.env.API_KEY;
const API_URL: string = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";

export function setupWordDictApiHandler(): void {
  ipcMain.on("word-dict-request", async (event, { word }: { word: string }) => {
    const window = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
    if (!window) return;

    const sendError = (message: string): void => {
      event.sender.send("word-dict-error", message);
    };

    if (!API_KEY) {
      sendError("API_KEY is not defined in environment variables.");
      return;
    }

    try {
      if (!word) {
        sendError("缺少必要的参数: word");
        return;
      }

      const detailPrompt = `
你是一个专为日语设计的、高精度的语言学分析API。你的核心任务是接收一个日语查询词 [クエリ]，然后返回一个结构化、信息丰富的JSON对象，该对象必须深度反映日语的语言特性。

核心准则：

JSON唯一：你的响应必须是且只能是一个语法无误的JSON对象。禁止在JSON前后附加任何说明、问候或非JSON文本。

深度语言学信息：除了基本释义，你必须提供活用、声调、词源、自他动词对应、关联敬语等日语特有的语言学信息。

严谨的结构：严格遵循下面定义的JSON结构。

未找到的情况：若词典中不存在该词，返回指定的错误结构。

情况一：查询成功

返回的JSON对象必须遵循以下结构。

JSON

{
  "found": true,
  "query": "[用户查询的原始词]",
  "keyword": "[词典标准型]",
  "entry": {
    "writings": [
      {
        "kanji": "[汉字写法]",
        "kana": "[对应的读音]",
        "common": true,
        "notes": "常用写法"
      },
      {
        "kanji": "[异体字写法]",
        "kana": "[对应的读音]",
        "common": false,
        "notes": "罕见或特定语境写法"
      }
    ],
    "pronunciation": {
      "reading": "[最常用读音]",
      "pitch_accent": [
        {
          "pattern_text": "あ[ける",
          "type": "尾高型 (Odaka-gata)",
          "morae": 2
        }
      ],
      "audio_url": "https://example.com/audio/akeru.mp3"
    },
    "linguistics": {
      "word_class": "下一段活用动词",
      "etymology": "和語 (Wago)",
      "conjugation": {
        "type": "下一段 (Shimo-ichidan)",
        "forms": {
          "dictionary": "開ける",
          "masu": "開けます",
          "te": "開けて",
          "nai": "開けない",
          "past": "開けた",
          "volitional": "開けよう"
        }
      },
      "transitivity": {
        "type": "他動詞 (Tadoushi)",
        "pair": "開く (aku)"
      }
    },
    "senses": [
      {
        "definitions": {
          "zh-CN": "[中文释义1，例如：打开（门、窗等）]",
          "en-US": "[English definition 1, e.g., to open (a door, window, etc.)]"
        },
        "usage_notes": "[关于此义项的用法说明或语境 nuance]",
        "relations": {
          "synonyms": ["開く (hiraku)"],
          "antonyms": ["閉める (shimeru)"]
        },
        "keigo": {
          "respectful": "お開けになる",
          "humble": null
        },
        "example_sentences": [
          {
            "ja": "ドアを開けてください。",
            "zh-CN": "请开门。",
            "en-US": "Please open the door."
          }
        ]
      },
      {
        "definitions": {
          "zh-CN": "[中文释义2，例如：开始；开办]",
          "en-US": "[English definition 2, e.g., to start; to establish]"
        },
        "usage_notes": "常用于开设店铺或举办活动。",
        "relations": {
          "synonyms": ["始める", "開催する"],
          "antonyms": ["終える"]
        },
        "keigo": {},
        "example_sentences": [
          {
            "ja": "彼は新しい店を開けた。",
            "zh-CN": "他开了一家新店。",
            "en-US": "He opened a new store."
          }
        ]
      }
    ]
  }
}

字段说明：

pronunciation.pitch_accent: 声调数组。
pattern_text: 声调的可视化表示，用 [ 和 ] 标记音高下降的位置。
type: 声调类型（平板型、頭高型、中高型、尾高型）。
linguistics: 语言学信息的核心模块。
word_class: 词性，对活用词进行更精确的分类（例如“五段活用动词”）。
etymology: 词源，标记 和語 (wago)、漢語 (kango) 或 外来語 (gairaigo)。
conjugation: 活用/变形信息，包含类型和主要变形形式。
transitivity: 自动词/他动词信息，包含类型和其对应的词。
senses.[item].relations: 关联词，包含同义词和反义词。
senses.[item].relations: 敬语形式，包含尊敬语和谦让语。

情况二：查询失败

若单词未找到，返回结构保持简单：

JSON

{
  "found": false,
  "query": "[用户查询的原始词]"
}

任务开始。

第一个需要查询的词是：${word}
`;
      const payload = {
        model: MODEL_NAME,
        messages: [{ role: "user", content: detailPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
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
          "AI API error (Word Dict):",
          errorData || "响应体不是有效的JSON"
        );
        let errorMessage = "处理请求时出错";
        if (
          errorData &&
          typeof errorData === "object" &&
          "error" in errorData &&
          errorData.error &&
          typeof errorData.error === "object" &&
          "message" in errorData.error &&
          typeof errorData.error.message === "string"
        ) {
          errorMessage = errorData.error.message;
        }
        sendError(errorMessage);
        return;
      }

      const data = (await response.json()) as GeminiNonStreamResponse;
      console.log("Received word-dict-response:", data);

      try {
        const jsonString = data.choices[0].message.content
          .replace(/```json\n|```/g, "")
          .trim();
        const wordDetail = JSON.parse(jsonString);
        window.webContents.send("word-dict-response", wordDetail);
      } catch (parseError) {
        console.error("Failed to parse word dict JSON:", parseError);
        sendError("Failed to parse word dict from AI response.");
      }
    } catch (error: unknown) {
      console.error("Server error (Word Dict):", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal Server Error";
      sendError(errorMessage);
    }
  });
}
