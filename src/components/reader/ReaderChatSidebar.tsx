import React, { useMemo, useState } from "react";
import type {
  RoleplayAnalysisState,
  RoleplayCharacterProfile,
  RoleplayChatHistoryMessage,
} from "../../types/roleplay";

interface ReaderChatSidebarProps {
  isOpen: boolean;
  chapterTitle: string;
  analysisState: RoleplayAnalysisState;
  selectedCharacter: string | null;
  onSelectCharacter: (name: string) => void;
  onRetryAnalysis?: () => void;
  onClose: () => void;
  messages: RoleplayChatHistoryMessage[];
  onSendMessage: (text: string) => void;
  isSending?: boolean;
  chatError?: string;
}

const findSelectedProfile = (
  characters: RoleplayCharacterProfile[],
  selectedCharacter: string | null
) => {
  if (selectedCharacter) {
    const matched = characters.find((item) => item.name === selectedCharacter);
    if (matched) {
      return matched;
    }
  }
  return characters[0];
};

const ReaderChatSidebar: React.FC<ReaderChatSidebarProps> = ({
  isOpen,
  chapterTitle,
  analysisState,
  selectedCharacter,
  onSelectCharacter,
  onRetryAnalysis,
  onClose,
  messages,
  onSendMessage,
  isSending = false,
  chatError,
}) => {
  const { status, characters, error } = analysisState;
  const overlayClasses = isOpen
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";
  const sidebarClasses = isOpen ? "translate-x-0" : "translate-x-full";
  const ariaHidden = isOpen ? undefined : true;
  const selectedProfile = findSelectedProfile(characters, selectedCharacter);
  const [inputValue, setInputValue] = useState("");

  const canSend =
    status === "ready" &&
    Boolean(selectedProfile) &&
    !isSending &&
    inputValue.trim().length > 0;

  const renderMessages = useMemo(() => {
    if (!messages || messages.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-500">
          选择角色后即可开始对话。你的消息和回复会显示在这里。
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={`${msg.role}-${index}-${msg.content.slice(0, 8)}`}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-[#007aff] text-white"
                    : "bg-white border border-gray-200/60 text-[#1d1d1f]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }
    const text = inputValue.trim();
    if (!text) {
      return;
    }
    onSendMessage(text);
    setInputValue("");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-250 ${overlayClasses}`}
        aria-hidden={ariaHidden}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(92vw,420px)] max-w-lg flex-col bg-[#f9f9f9]/95 backdrop-blur-xl border-l border-gray-200/60 shadow-xl shadow-black/8 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarClasses}`}
        aria-hidden={ariaHidden}
        aria-label="交互式角色扮演聊天"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-200/60 px-5 pt-14 pb-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Nichijo</h2>
            <p className="max-h-10 overflow-hidden text-[13px] text-gray-500 leading-snug">
              {chapterTitle || "未命名章节"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭交互式聊天"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 transition-colors hover:bg-black/[0.1] hover:text-gray-700 active:scale-95"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-4">
          {(status === "loading" || status === "idle") && (
            <div className="rounded-xl bg-white/80 border border-gray-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-3 text-[#1d1d1f]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007aff] border-t-transparent" />
                <div className="text-[15px] font-semibold">交互式聊天正在初始化</div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                正在解析本章节中的角色信息，请稍候。
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl bg-white/80 border border-gray-200/60 p-4 shadow-sm">
              <div className="text-[15px] font-semibold text-[#1d1d1f]">初始化失败</div>
              <p className="mt-2 text-sm text-gray-500">
                {error || "未能获取角色信息，请稍后重试。"}
              </p>
              {onRetryAnalysis ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onRetryAnalysis}
                    className="inline-flex items-center justify-center rounded-lg bg-[#007aff] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#0071f3] active:bg-[#006ee0]"
                  >
                    重新尝试
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {status === "ready" && characters.length === 0 && (
            <div className="rounded-xl bg-white/80 border border-gray-200/60 p-4 shadow-sm">
              <div className="text-[15px] font-semibold text-[#1d1d1f]">未找到角色</div>
              <p className="mt-2 text-sm text-gray-500">
                本章节似乎没有可供互动的角色，尝试切换章节或重新分析。
              </p>
            </div>
          )}

          {status === "ready" && characters.length > 0 && (
            <>
              {/* Character selector */}
              <div className="rounded-xl bg-white/80 border border-gray-200/60 p-4 shadow-sm">
                <label className="text-[13px] font-semibold text-[#1d1d1f]">
                  角色
                </label>
                <div className="mt-2">
                  <select
                    className="w-full rounded-lg border border-gray-200/60 bg-white px-3 py-2 text-[14px] font-medium text-[#1d1d1f] outline-none transition-colors focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20"
                    value={selectedProfile?.name ?? ""}
                    onChange={(event) => onSelectCharacter(event.target.value)}
                  >
                    {characters.map((character) => (
                      <option key={character.name} value={character.name}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat area */}
              <div className="flex flex-1 flex-col gap-3 rounded-xl bg-white/80 border border-gray-200/60 p-4 shadow-sm min-h-0">
                <div className="text-[13px] font-semibold text-[#1d1d1f]">
                  对话
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain min-h-[120px]">
                  {renderMessages}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200/60 rounded-2xl px-4 py-2.5 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {chatError ? (
                  <div className="rounded-lg bg-[#ff3b30]/10 border border-[#ff3b30]/20 px-3 py-2 text-xs font-medium text-[#ff3b30]">
                    {chatError}
                  </div>
                ) : null}
                <form className="flex-shrink-0 space-y-2" onSubmit={handleSubmit}>
                  <textarea
                    className="h-20 w-full rounded-lg border border-gray-200/60 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none transition-colors placeholder:text-gray-400 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 resize-none"
                    placeholder="输入想对角色说的话..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    disabled={status !== "ready" || isSending || !selectedProfile}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!canSend}
                      className={`inline-flex items-center justify-center rounded-lg bg-[#007aff] px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-[#0071f3] active:bg-[#006ee0] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${isSending ? "opacity-70 cursor-wait" : ""}`}
                    >
                      {isSending ? "发送中..." : "发送"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default ReaderChatSidebar;
