在日语句子 {{sentence_quoted}} 的上下文中，单词 {{word_quoted}} (词性: {{pos_display}}{{furigana_note}}{{romaji_note}}) 的具体含义是什么？请提供以下信息，并以严格的 JSON 对象格式返回，不要包含任何 markdown 或其他非 JSON 字符：

请特别注意：
1. 如果是动词，准确识别其时态（过去式、现在式等）、语态（被动、使役等）和礼貌程度（简体、敬体等）
2. 对于助动词与动词组合（如"食べた"），明确说明原形及活用变化过程
3. 对于形容词，注意区分い形容词和な形容词，并识别其活用形式
4. 准确提供辞书形，对于已经是辞书形的词汇，可以填写相同的值

{
  "originalWord": {{word_quoted}},
  "chineseTranslation": "中文翻译",
  "pos": {{pos_quoted}},
  "furigana": {{furigana_quoted}},
  "romaji": {{romaji_quoted}},
  "dictionaryForm": "辞书形（如果适用）",
  "explanation": "中文解释（包括词形变化、时态、语态等详细语法信息）"
}

