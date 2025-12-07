import React, { useMemo, useState } from "react";
import BrutalistButton from "../ui/BrutalistButton";
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
        <div className="rounded-2xl border-4 border-dashed border-[#3d2b1f] bg-white/70 p-4 text-sm font-semibold text-[#3d2b1f]/80">
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
                className={`max-w-[80%] rounded-2xl border-4 px-3 py-2 text-sm font-semibold leading-relaxed shadow-[4px_4px_0px_0px_rgba(61,43,31,0.85)] ${
                  isUser
                    ? "border-[#3d2b1f] bg-[#d4a017] text-white"
                    : "border-[#3d2b1f] bg-white text-[#3d2b1f]"
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
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-200 ${overlayClasses}`}
        aria-hidden={ariaHidden}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(92vw,420px)] max-w-lg flex-col border-l-4 border-[#3d2b1f] bg-[#f5f5dc] shadow-[-6px_0px_0px_0px_rgba(61,43,31,1)] transition-transform duration-200 ${sidebarClasses}`}
        aria-hidden={ariaHidden}
        aria-label="交互式角色扮演聊天"
      >
        <div className="flex items-start justify-between border-b-4 border-[#3d2b1f] bg-[#f5f5dc] px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-[#3d2b1f]">交互式聊天</h2>
            <p className="max-h-12 overflow-hidden text-sm font-semibold text-[#3d2b1f]/80">
              当前章节：{chapterTitle || "未命名章节"}
            </p>
          </div>
          <BrutalistButton
            onClick={onClose}
            className="p-2 text-base sm:text-lg"
            aria-label="关闭交互式聊天"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </BrutalistButton>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#f5f5dc] px-5 py-4">
          {(status === "loading" || status === "idle") && (
            <div className="rounded-2xl border-4 border-[#3d2b1f] bg-white/70 p-4 shadow-[6px_6px_0px_0px_rgba(61,43,31,0.85)]">
              <div className="flex items-center gap-3 text-[#3d2b1f]">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#3d2b1f] border-t-transparent" />
                <div className="text-lg font-black">交互式聊天正在初始化</div>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#3d2b1f]/80">
                正在解析本章节中的角色信息，请稍候。
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl border-4 border-[#3d2b1f] bg-white/70 p-4 shadow-[6px_6px_0px_0px_rgba(61,43,31,0.85)] text-[#3d2b1f]">
              <div className="text-lg font-black">初始化失败</div>
              <p className="mt-2 text-sm font-semibold text-[#3d2b1f]/80">
                {error || "未能获取角色信息，请稍后重试。"}
              </p>
              {onRetryAnalysis ? (
                <div className="mt-3">
                  <BrutalistButton onClick={onRetryAnalysis}>
                    重新尝试
                  </BrutalistButton>
                </div>
              ) : null}
            </div>
          )}

          {status === "ready" && characters.length === 0 && (
            <div className="rounded-2xl border-4 border-[#3d2b1f] bg-white/70 p-4 text-[#3d2b1f] shadow-[6px_6px_0px_0px_rgba(61,43,31,0.85)]">
              <div className="text-lg font-black">未找到角色</div>
              <p className="mt-2 text-sm font-semibold text-[#3d2b1f]/80">
                本章节似乎没有可供互动的角色，尝试切换章节或重新分析。
              </p>
            </div>
          )}

          {status === "ready" && characters.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl border-4 border-[#3d2b1f] bg-white/80 p-4 shadow-[6px_6px_0px_0px_rgba(61,43,31,0.85)]">
                <label className="text-base font-black text-[#3d2b1f]">
                  选择对话角色
                </label>
                <div className="mt-2">
                  <select
                    className="w-full rounded-xl border-4 border-[#3d2b1f] bg-white px-3 py-2 text-base font-bold text-[#3d2b1f] outline-none ring-offset-2 focus:ring-2 focus:ring-[#b3312c]"
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

              <div className="space-y-3 rounded-2xl border-4 border-[#3d2b1f] bg-white/80 p-4 shadow-[6px_6px_0px_0px_rgba(61,43,31,0.85)]">
                <div className="text-base font-black text-[#3d2b1f]">
                  对话
                </div>
                <div className="flex max-h-80 min-h-[160px] flex-col gap-3 overflow-y-auto">
                  {renderMessages}
                </div>
                {chatError ? (
                  <div className="rounded-xl border-4 border-[#3d2b1f] bg-[#b3312c] px-3 py-2 text-xs font-black text-white">
                    {chatError}
                  </div>
                ) : null}
                <form className="space-y-2" onSubmit={handleSubmit}>
                  <textarea
                    className="h-20 w-full rounded-xl border-4 border-[#3d2b1f] bg-white px-3 py-2 text-sm font-semibold text-[#3d2b1f] outline-none ring-offset-2 focus:ring-2 focus:ring-[#b3312c]"
                    placeholder="输入想对角色说的话..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    disabled={status !== "ready" || isSending || !selectedProfile}
                  />
                  <div className="flex justify-end">
                    <BrutalistButton
                      type="submit"
                      disabled={!canSend}
                      className={isSending ? "opacity-70 cursor-wait" : ""}
                    >
                      {isSending ? "发送中..." : "发送"}
                    </BrutalistButton>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ReaderChatSidebar;
