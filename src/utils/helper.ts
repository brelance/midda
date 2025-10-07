// 工具函数

// 检查字符串是否包含汉字
export function containsKanji(text: string): boolean {
  const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]/;
  return kanjiRegex.test(text);
}

// 获取词性对应的CSS类名
export function getPosClass(pos: string): string {
  const basePos = pos.split("-")[0];
  const knownPos = [
    "名詞",
    "動詞",
    "形容詞",
    "副詞",
    "助詞",
    "助動詞",
    "接続詞",
    "感動詞",
    "連体詞",
    "代名詞",
    "形状詞",
    "記号",
    "接頭辞",
    "接尾辞",
    "フィラー",
    "その他",
  ];
  if (knownPos.includes(basePos)) {
    return `pos-${basePos}`;
  }
  return "pos-default";
}

// 词性中日对照表
export const posChineseMap: Record<string, string> = {
  名詞: "名词",
  動詞: "动词",
  形容詞: "形容词",
  副詞: "副词",
  助詞: "助词",
  助動詞: "助动词",
  接続詞: "接续词",
  感動詞: "感动词",
  連体詞: "连体词",
  代名詞: "代名词",
  形状詞: "形容动词",
  記号: "符号",
  接頭辞: "接头辞",
  接尾辞: "接尾辞",
  フィラー: "填充词",
  その他: "其他",
  default: "未知词性",
};

// 朗读日语文本
export function speakJapanese(text: string): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("浏览器不支持语音朗读功能");
  }
}

export function randomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
