import React from "react";
import type { ZoomMode } from "../../hooks/useImageReaderZoom";
import type { OcrEngine } from "../../pages/ImageReaderPage/ImageReaderPage";
import type { ReadingMode } from "../../pages/ImageReaderPage/imageReaderModeSelectors";
import { useReaderSettings } from "../../stores/readerSettingsStore";

const FONT_FAMILY_OPTIONS: { value: string; label: string }[] = [
  { value: "",                              label: "书籍默认" },
  { value: "-apple-system, 'Hiragino Sans', sans-serif",        label: "Hiragino Sans" },
  { value: "'Hiragino Mincho ProN', serif",  label: "Hiragino Mincho" },
  { value: "'SF Pro Text', -apple-system, sans-serif",          label: "SF Pro Text" },
  { value: "'Noto Sans JP', sans-serif",     label: "Noto Sans JP" },
  { value: "'Noto Serif JP', serif",         label: "Noto Serif JP" },
  { value: "'Georgia', serif",               label: "Georgia" },
  { value: "'Palatino', 'Palatino Linotype', serif",            label: "Palatino" },
  { value: "'PingFang SC', sans-serif",      label: "苹方" },
  { value: "'Songti SC', serif",             label: "宋体" },
];

interface ImageReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Zoom
  zoomMode: ZoomMode;
  onZoomModeChange: (mode: ZoomMode) => void;
  // View mode
  viewMode: "page" | "scroll";
  onViewModeChange: (mode: "page" | "scroll") => void;
  // Reading mode (browse / text / study)
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
  // OCR engine
  ocrEngine: OcrEngine;
  onOcrEngineChange: (engine: OcrEngine) => void;
}

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
    <span className="flex h-8 min-w-10 max-w-28 items-center justify-center border-x border-gray-200/80 px-2 text-[13px] font-medium text-[#1d1d1f] whitespace-nowrap overflow-hidden text-ellipsis">
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

const ImageReaderSettingsModal: React.FC<ImageReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  zoomMode,
  onZoomModeChange,
  viewMode,
  onViewModeChange,
  readingMode,
  onReadingModeChange,
  ocrEngine,
  onOcrEngineChange,
}) => {
  const { fontFamily, setFontFamily, fontSize, setFontSize, lineHeight, setLineHeight } = useReaderSettings();

  // Check native OCR availability (only needed for engine selector)
  const [ocrAvailable, setOcrAvailable] = React.useState(false);
  React.useEffect(() => {
    if (!isOpen) return;
    window?.api?.ocr?.isAvailable?.()
      .then((available) => setOcrAvailable(available))
      .catch(() => {});
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-reader-settings-title"
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
            id="image-reader-settings-title"
            className="text-lg font-semibold text-[#1d1d1f] tracking-tight"
          >
            阅读设置
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
                <div>
                  <span className="text-[15px] font-medium text-[#1d1d1f]">版面</span>
                  {readingMode === "study" && (
                    <p className="mt-0.5 text-[12px] leading-snug text-[#007aff]">精读模式固定为单页</p>
                  )}
                </div>
                <SegmentedControl
                  id="image-reading-mode-control"
                  value={readingMode}
                  onChange={onReadingModeChange}
                  options={[
                    { label: "浏览", value: "browse" },
                    { label: "文字", value: "text" },
                    { label: "精读", value: "study" },
                  ]}
                />
              </div>
              {readingMode !== "study" && (
                <>
                  <div className="my-3 h-px bg-gray-100" />
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium text-[#1d1d1f]">视图模式</span>
                    <SegmentedControl
                      id="image-view-mode-control"
                      value={viewMode}
                      onChange={onViewModeChange}
                      options={[
                        { label: "单页", value: "page" },
                        { label: "滚动", value: "scroll" },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>

            {/* ── 缩放 ── */}
            {readingMode !== "study" && (
              <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">缩放</span>
                  <SegmentedControl
                    id="image-zoom-mode-control"
                    value={zoomMode}
                    onChange={onZoomModeChange}
                    options={[
                      { label: "页面", value: "fit-page" },
                      { label: "宽度", value: "fit-width" },
                      { label: "实际", value: "actual" },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* ── 识别引擎 (仅在文字/精读模式下可见) ── */}
            {readingMode !== "browse" && (
              <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">识别引擎</span>
                  <SegmentedControl
                    id="image-ocr-engine-control"
                    value={ocrEngine}
                    onChange={onOcrEngineChange}
                    options={[
                      ...(ocrAvailable ? [{ label: "普通", value: "native" as OcrEngine }] : []),
                      { label: "漫画", value: "manga" as OcrEngine },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* ── 字体 ── */}
            <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#1d1d1f]">字体</span>
                <Stepper
                  label="字体"
                  value={FONT_FAMILY_OPTIONS[FONT_FAMILY_OPTIONS.findIndex((o) => o.value === fontFamily) >= 0 ? FONT_FAMILY_OPTIONS.findIndex((o) => o.value === fontFamily) : 0].label}
                  onDecrement={() => {
                    const idx = FONT_FAMILY_OPTIONS.findIndex((o) => o.value === fontFamily);
                    const prev = idx <= 0 ? FONT_FAMILY_OPTIONS.length - 1 : idx - 1;
                    setFontFamily(FONT_FAMILY_OPTIONS[prev].value);
                  }}
                  onIncrement={() => {
                    const idx = FONT_FAMILY_OPTIONS.findIndex((o) => o.value === fontFamily);
                    const next = idx >= FONT_FAMILY_OPTIONS.length - 1 ? 0 : idx + 1;
                    setFontFamily(FONT_FAMILY_OPTIONS[next].value);
                  }}
                />
              </div>
            </div>

            {/* ── 字号 & 行高 (only in study mode) ── */}
            {readingMode === "study" && (
              <div className="rounded-xl bg-white p-4 shadow-sm shadow-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">字号</span>
                  <Stepper
                    label="字号"
                    value={`${fontSize}px`}
                    onDecrement={() => setFontSize(Math.max(12, fontSize - 1))}
                    onIncrement={() => setFontSize(Math.min(32, fontSize + 1))}
                    disableDecrement={fontSize <= 12}
                    disableIncrement={fontSize >= 32}
                  />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">行高</span>
                  <Stepper
                    label="行高"
                    value={lineHeight.toFixed(1)}
                    onDecrement={() => setLineHeight(Math.max(1.2, Math.round((lineHeight - 0.1) * 10) / 10))}
                    onIncrement={() => setLineHeight(Math.min(2.5, Math.round((lineHeight + 0.1) * 10) / 10))}
                    disableDecrement={lineHeight <= 1.2}
                    disableIncrement={lineHeight >= 2.5}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageReaderSettingsModal;
