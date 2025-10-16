import React from "react";

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
}

const themeSwatches = [
  { color: "#f5f5dc", active: true },
  { color: "#c1e1c1", active: false },
  { color: "#f0e68c", active: false },
  { color: "#1e1e1e", active: false },
];

const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  ttsLanguage,
  onTtsLanguageChange,
  ttsLanguageOptions,
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
        className="flex w-full max-w-[520px] max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[20px] border-4 border-[#3d2b1f] bg-[#f5f5dc] shadow-[8px_8px_0px_0px_#3d2b1f] sm:max-h-[calc(100vh-4rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] px-4 py-3 sm:px-6 sm:py-4">
          <h2
            id="reader-settings-title"
            className="text-xl font-black text-[#3d2b1f] sm:text-2xl"
          >
            显示设置
          </h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-white shadow-[4px_4px_0px_0px_#3d2b1f] transition hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#3d2b1f] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none sm:h-12 sm:w-12"
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

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-4">
              <span className="text-lg font-bold text-[#3d2b1f]">字体大小</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-2xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-12 sm:w-12"
                >
                  –
                </button>
                <span className="w-14 text-center text-lg font-black text-[#3d2b1f] sm:text-xl">
                  常规
                </span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-2xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-12 sm:w-12"
                >
                  ＋
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-4">
              <span className="text-lg font-bold text-[#3d2b1f]">行高</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-2xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-12 sm:w-12"
                >
                  –
                </button>
                <span className="w-14 text-center text-lg font-black text-[#3d2b1f] sm:text-xl">
                  1.8
                </span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border-4 border-[#3d2b1f] bg-[#d4a017] text-2xl font-black text-white shadow-[4px_4px_0px_0px_#3d2b1f] sm:h-12 sm:w-12"
                >
                  ＋
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b-4 border-[#3d2b1f] pb-4">
              <span className="text-lg font-bold text-[#3d2b1f]">主题</span>
              <div className="flex items-center gap-4">
                {themeSwatches.map((theme) => (
                  <button
                    key={theme.color}
                    type="button"
                    style={{ backgroundColor: theme.color }}
                    className={`h-10 w-10 rounded-full border-4 border-[#3d2b1f] transition ${
                      theme.active
                        ? "outline outline-4 outline-offset-4 outline-[#3d2b1f]"
                        : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#3d2b1f]">
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

        <div className="flex justify-end border-t-4 border-[#3d2b1f] px-4 py-3 sm:px-6 sm:py-4">
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
