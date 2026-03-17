import React from "react";
import { ReadingMode, ScrollMode, ReaderTheme } from "../../types/reader";

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
  scrollMode: ScrollMode;
  onScrollModeChange: (mode: ScrollMode) => void;
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
  // Typography & theme
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (lh: number) => void;
  readerTheme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
}

const FONT_SIZE_STEPS = [14, 16, 18, 20, 22, 24];
const LINE_HEIGHT_STEPS = [1.4, 1.6, 1.8, 2.0, 2.2];

const THEME_OPTIONS: { id: ReaderTheme; color: string; label: string }[] = [
  { id: "light", color: "#ffffff", label: "白色" },
  { id: "warm",  color: "#faf5e4", label: "暖白" },
  { id: "green", color: "#d4edda", label: "绿色" },
  { id: "dark",  color: "#1c1c1e", label: "深色" },
];

/** iOS-style segmented control */
const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  id,
  disabled = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
  disabled?: boolean;
}) => (
  <div
    className={`flex overflow-hidden rounded-lg bg-black/[0.06] p-0.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    role="group"
    id={id}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        role="radio"
        aria-checked={value === opt.value}
        onClick={() => onChange(opt.value)}
        className={`
          flex-1 rounded-md px-3.5 py-1.5 text-[13px] font-medium
          transition-all duration-200
          ${value === opt.value
            ? "bg-white text-[#1d1d1f] shadow-sm"
            : "text-gray-500 hover:text-gray-700"
          }
        `}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

/** iOS-style toggle switch */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`
      relative h-[31px] w-[51px] flex-shrink-0 rounded-full
      transition-colors duration-250 ease-in-out
      ${checked ? "bg-[#34c759]" : "bg-gray-300"}
    `}
  >
    <span
      className={`
        absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white
        shadow-sm shadow-black/15
        transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}
      `}
    />
  </button>
);

/** Stepper (+ / –) */
const Stepper: React.FC<{
  label: string;
  value: string;
  onDecrement?: () => void;
  onIncrement?: () => void;
  disableDecrement?: boolean;
  disableIncrement?: boolean;
}> = ({ label: _label, value, onDecrement, onIncrement, disableDecrement, disableIncrement }) => (
  <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-gray-200/80 bg-white">
    <button
      type="button"
      onClick={onDecrement}
      disabled={disableDecrement || !onDecrement}
      className="flex h-8 w-9 items-center justify-center text-[#007aff] text-lg font-medium transition-colors hover:bg-black/[0.04] active:bg-black/[0.08] disabled:text-gray-300"
      aria-label={`减小${_label}`}
    >
      −
    </button>
    <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200/80 text-[13px] font-medium text-[#1d1d1f]">
      {value}
    </span>
    <button
      type="button"
      onClick={onIncrement}
      disabled={disableIncrement || !onIncrement}
      className="flex h-8 w-9 items-center justify-center text-[#007aff] text-lg font-medium transition-colors hover:bg-black/[0.04] active:bg-black/[0.08] disabled:text-gray-300"
      aria-label={`增大${_label}`}
    >
      +
    </button>
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
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  readerTheme,
  onThemeChange,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fontSizeIndex = FONT_SIZE_STEPS.indexOf(fontSize);
  const lineHeightIndex = LINE_HEIGHT_STEPS.indexOf(lineHeight);

  const fontSizeLabel = fontSize === 18 ? "常规" : `${fontSize}`;
  const lineHeightLabel = String(lineHeight);

  const handleFontSizeDecrement = () => {
    const idx = fontSizeIndex > 0 ? fontSizeIndex - 1 : 0;
    onFontSizeChange(FONT_SIZE_STEPS[idx]);
  };
  const handleFontSizeIncrement = () => {
    const idx = fontSizeIndex < FONT_SIZE_STEPS.length - 1 ? fontSizeIndex + 1 : fontSizeIndex;
    onFontSizeChange(FONT_SIZE_STEPS[idx]);
  };
  const handleLineHeightDecrement = () => {
    const idx = lineHeightIndex > 0 ? lineHeightIndex - 1 : 0;
    onLineHeightChange(LINE_HEIGHT_STEPS[idx]);
  };
  const handleLineHeightIncrement = () => {
    const idx = lineHeightIndex < LINE_HEIGHT_STEPS.length - 1 ? lineHeightIndex + 1 : lineHeightIndex;
    onLineHeightChange(LINE_HEIGHT_STEPS[idx]);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-settings-title"
      onClick={onClose}
    >
      <div
        className={`
          flex w-full sm:w-auto sm:min-w-[380px] sm:max-w-[420px]
          max-h-[85vh]
          flex-col overflow-hidden
          rounded-2xl
          bg-[#f2f2f7]/95 backdrop-blur-xl
          shadow-2xl shadow-black/15
          animate-[slideUp_300ms_cubic-bezier(0.32,0.72,0,1)]
        `}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2
            id="reader-settings-title"
            className="text-lg font-semibold text-[#1d1d1f] tracking-tight"
          >
            显示设置
          </h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 transition-colors hover:bg-black/[0.1] hover:text-gray-700 active:scale-95"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 py-4">
          <div className="space-y-5">

            {/* ── 阅读方式 ── */}
            <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1d1d1f]">阅读方式</span>
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
              <div className="my-3 h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className={`text-[15px] font-medium ${scrollMode === "scroll" ? "text-gray-400" : "text-[#1d1d1f]"}`}>版面</span>
                <SegmentedControl
                  id="reading-mode-control"
                  value={readingMode}
                  onChange={onReadingModeChange}
                  disabled={scrollMode === "scroll"}
                  options={[
                    { label: "单页", value: "single" },
                    { label: "双页", value: "double" },
                  ]}
                />
              </div>
            </div>

            {/* ── 字体与排版 ── */}
            <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1d1d1f]">字体大小</span>
                <Stepper
                  label="字体大小"
                  value={fontSizeLabel}
                  onDecrement={handleFontSizeDecrement}
                  onIncrement={handleFontSizeIncrement}
                  disableDecrement={fontSizeIndex <= 0}
                  disableIncrement={fontSizeIndex >= FONT_SIZE_STEPS.length - 1}
                />
              </div>
              <div className="my-3 h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1d1d1f]">行高</span>
                <Stepper
                  label="行高"
                  value={lineHeightLabel}
                  onDecrement={handleLineHeightDecrement}
                  onIncrement={handleLineHeightIncrement}
                  disableDecrement={lineHeightIndex <= 0}
                  disableIncrement={lineHeightIndex >= LINE_HEIGHT_STEPS.length - 1}
                />
              </div>
            </div>

            {/* ── 主题 ── */}
            <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
              <span className="mb-3 block text-[15px] font-medium text-[#1d1d1f]">主题</span>
              <div className="flex items-center gap-4">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-label={theme.label}
                    onClick={() => onThemeChange(theme.id)}
                    style={{ backgroundColor: theme.color }}
                    className={`
                      h-9 w-9 rounded-full border
                      transition-all duration-150
                      ${readerTheme === theme.id
                        ? "border-[#007aff] ring-2 ring-[#007aff]/30 ring-offset-2"
                        : "border-gray-200 hover:border-gray-400"
                      }
                      ${theme.id === "dark" ? "border-gray-600" : ""}
                    `}
                  />
                ))}
              </div>
            </div>

            {/* ── TTS 设置 ── */}
            <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-3">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">划过分词朗读</span>
                  <p className="mt-0.5 text-[13px] leading-snug text-gray-400">鼠标划过分词时自动朗读</p>
                </div>
                <ToggleSwitch
                  checked={enableTokenHoverTts}
                  onChange={onEnableTokenHoverTtsChange}
                  label="划过分词朗读"
                />
              </div>
              <div className="my-3 h-px bg-gray-100" />
              <div>
                <span className="text-[15px] font-medium text-[#1d1d1f]">TTS 朗读语言</span>
                <p className="mt-0.5 mb-2.5 text-[13px] leading-snug text-gray-400">选择朗读时优先使用的语音语言</p>
                <select
                  id="tts-language-select"
                  className="w-full appearance-none rounded-lg border border-gray-200/80 bg-[#f9f9f9] px-3 py-2.5 text-[15px] text-[#1d1d1f] transition-colors focus:border-[#007aff] focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                  value={ttsLanguage}
                  onChange={(event) => onTtsLanguageChange(event.target.value)}
                >
                  {ttsLanguageOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderSettingsModal;
