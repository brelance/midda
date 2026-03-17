import React from "react";
import { ReadingMode, ScrollMode } from "../../types/reader";

interface TtsLanguageOption {
  value: string;
  label: string;
}

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ttsLanguage: string;
  onTtsLanguageChange: (language: string) => void;
  ttsLanguageOptions: TtsLanguageOption[];
  enableTokenHoverTts: boolean;
  onEnableTokenHoverTtsChange: (enabled: boolean) => void;
  // Layout & scroll mode
  scrollMode: ScrollMode;
  onScrollModeChange: (mode: ScrollMode) => void;
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
}

const themeSwatches = [
  { color: "#f5f5dc", active: true },
  { color: "#c1e1c1", active: false },
  { color: "#f0e68c", active: false },
  { color: "#1e1e1e", active: false },
];

/** Segmented control — two option toggle button group */
const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) => (
  <div
    className="flex overflow-hidden rounded-[14px] border-4 border-[#3d2b1f]"
    role="group"
    id={id}
  >
    {options.map((opt, i) => (
      <button
        key={opt.value}
        type="button"
        role="radio"
        aria-checked={value === opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 px-3 py-2 text-sm font-bold transition-colors ${
          i > 0 ? "border-l-4 border-[#3d2b1f]" : ""
        } ${
          value === opt.value
            ? "bg-[#3d2b1f] text-white"
            : "bg-white text-[#3d2b1f] hover:bg-[#f0ede8]"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  ttsLanguage,
  onTtsLanguageChange,
  ttsLanguageOptions,
  enableTokenHoverTts,
  onEnableTokenHoverTtsChange,
  scrollMode,
  onScrollModeChange,
  readingMode,
  onReadingModeChange,
}) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-settings-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[420px] max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[20px] border-4 border-[#3d2b1f] bg-[#f5f5dc] shadow-[8px_8px_0px_0px_#3d2b1f] sm:max-h-[calc(100vh-4rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] px-3 py-2 sm:px-4 sm:py-3">
          <h2
            id="reader-settings-title"
            className="text-lg font-black text-[#3d2b1f] sm:text-xl"
          >
            显示设置
          </h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-white shadow-[4px_4px_0px_0px_#3d2b1f] transition hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#3d2b1f] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none sm:h-11 sm:w-11"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <svg
              className="h-6 w-6 sm:h-7 sm:w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
          <div className="space-y-4 sm:space-y-5">

            {/* ── 阅读方式 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                阅读方式
              </span>
              <SegmentedControl
                id="scroll-mode-control"
                value={scrollMode}
                onChange={onScrollModeChange}
                options={[
                  { label: "滚动", value: "scroll" },
                  { label: "翻页", value: "page" },
                ]}
              />
            </div>

            {/* ── 版面 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                版面
              </span>
              <SegmentedControl
                id="reading-mode-control"
                value={readingMode}
                onChange={onReadingModeChange}
                options={[
                  { label: "单页", value: "single" },
                  { label: "双页", value: "double" },
                ]}
              />
            </div>

            {/* ── 字体大小 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                字体大小
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-11 sm:w-11"
                >
                  –
                </button>
                <span className="w-12 text-center text-base font-black text-[#3d2b1f] sm:w-14 sm:text-lg">
                  常规
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-11 sm:w-11"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* ── 行高 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                行高
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-11 sm:w-11"
                >
                  –
                </button>
                <span className="w-12 text-center text-base font-black text-[#3d2b1f] sm:w-14 sm:text-lg">
                  1.8
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-11 sm:w-11"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* ── 主题 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                主题
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                {themeSwatches.map((theme) => (
                  <button
                    key={theme.color}
                    type="button"
                    style={{ backgroundColor: theme.color }}
                    className={`h-9 w-9 rounded-full border-4 border-[#3d2b1f] transition sm:h-10 sm:w-10 ${
                      theme.active
                        ? "outline outline-4 outline-offset-4 outline-[#3d2b1f]"
                        : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* ── 划过分词朗读 ── */}
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-3">
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                  划过分词朗读
                </span>
                <span className="text-sm text-[#6b5b4b]">
                  鼠标划过分词时自动朗读并高亮路径。
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableTokenHoverTts}
                onClick={() => onEnableTokenHoverTtsChange(!enableTokenHoverTts)}
                className={`relative h-10 w-[74px] rounded-full border-4 border-[#3d2b1f] shadow-[4px_4px_0px_0px_#3d2b1f] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#3d2b1f] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
                  enableTokenHoverTts ? "bg-[#15803d]" : "bg-[#d8cfc4]"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-4 border-[#3d2b1f] bg-white transition ${
                    enableTokenHoverTts ? "left-[40px]" : "left-[6px]"
                  }`}
                />
              </button>
            </div>

            {/* ── TTS 朗读语言 ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#3d2b1f] sm:text-lg">
                  TTS 朗读语言
                </span>
              </div>
              <p className="text-sm text-[#6b5b4b]">
                选择朗读时优先使用的语音语言，若当前系统不支持将自动退回默认语音。
              </p>
              <select
                id="tts-language-select"
                className="w-full rounded-[18px] border-4 border-[#3d2b1f] bg-white px-3 py-3 text-base font-semibold text-[#3d2b1f] shadow-[6px_6px_0px_0px_#3d2b1f] transition hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_#3d2b1f] focus:translate-x-[3px] focus:translate-y-[3px] focus:shadow-[3px_3px_0px_0px_#3d2b1f] focus:outline-none sm:px-4"
                value={ttsLanguage}
                onChange={(event) => onTtsLanguageChange(event.target.value)}
              >
                {ttsLanguageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t-4 border-[#3d2b1f] px-3 py-3 sm:px-4 sm:py-4">
          <button
            type="button"
            className="rounded-[18px] border-4 border-[#3d2b1f] bg-white px-5 py-2 text-sm font-bold text-[#3d2b1f] shadow-[4px_4px_0px_0px_#3d2b1f] transition hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#3d2b1f] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none sm:rounded-[20px] sm:px-6"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderSettingsModal;
