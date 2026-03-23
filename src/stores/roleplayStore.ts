import { useCallback } from "react";
import { create } from "zustand";
import type {
  RoleplayAnalysisState,
  RoleplayChatHistoryMessage,
  RoleplayCharacterProfile,
} from "../types/roleplay";
import {
  analyzeChapterForRoleplay,
  sendRoleplayMessage as sendRoleplayMessageService,
} from "../services/interactiveRoleplay";

// ── Store state ──

export interface RoleplayState {
  /** Roleplay character analysis indexed by chapterId */
  analysisByChapter: Record<string, RoleplayAnalysisState>;
  /** Currently selected character per chapter */
  selectedCharacterByChapter: Record<string, string | null>;
  /** Chat messages indexed by session key (chapterId::characterName) */
  messagesBySession: Record<string, RoleplayChatHistoryMessage[]>;
  /** Chat errors indexed by session key */
  errorBySession: Record<string, string | undefined>;
  /** Whether a chat message is currently being sent */
  isChatSending: boolean;
  /** Whether the chat sidebar is open */
  isChatSidebarOpen: boolean;

  // ── Actions ──
  openChatSidebar: () => void;
  closeChatSidebar: () => void;
  resetForBook: () => void;
  resetChatSendingForSession: () => void;
  setSelectedCharacter: (chapterId: string, name: string) => void;
  autoSelectFirstCharacter: (chapterId: string) => void;

  // ── Async actions  ──
  ensureAnalysis: (params: {
    chapterId: string;
    bookId: string;
    bookTitle: string;
    chapterTitle: string;
    chapterPlainText: string;
    force?: boolean;
  }) => Promise<void>;

  sendMessage: (params: {
    chatSessionKey: string;
    character: RoleplayCharacterProfile;
    bookTitle: string;
    chapterTitle: string;
    chapterPlainText: string;
    text: string;
  }) => Promise<void>;
}

// Track request ids outside of state to avoid re-renders
let _analysisRequestId = 0;

export const useRoleplayStore = create<RoleplayState>()((set, get) => ({
  analysisByChapter: {},
  selectedCharacterByChapter: {},
  messagesBySession: {},
  errorBySession: {},
  isChatSending: false,
  isChatSidebarOpen: false,

  openChatSidebar: () => set({ isChatSidebarOpen: true }),
  closeChatSidebar: () => set({ isChatSidebarOpen: false }),

  resetForBook: () =>
    set({
      analysisByChapter: {},
      selectedCharacterByChapter: {},
      messagesBySession: {},
      errorBySession: {},
      isChatSending: false,
      isChatSidebarOpen: false,
    }),

  resetChatSendingForSession: () => set({ isChatSending: false }),

  setSelectedCharacter: (chapterId, name) =>
    set((s) => ({
      selectedCharacterByChapter: {
        ...s.selectedCharacterByChapter,
        [chapterId]: name,
      },
    })),

  autoSelectFirstCharacter: (chapterId) => {
    const { analysisByChapter, selectedCharacterByChapter } = get();
    const analysis = analysisByChapter[chapterId];
    if (
      !analysis ||
      analysis.status !== "ready" ||
      analysis.characters.length === 0
    ) {
      return;
    }
    const current = selectedCharacterByChapter[chapterId];
    if (
      current &&
      analysis.characters.some((c) => c.name === current)
    ) {
      return;
    }
    set((s) => ({
      selectedCharacterByChapter: {
        ...s.selectedCharacterByChapter,
        [chapterId]: analysis.characters[0]?.name ?? null,
      },
    }));
  },

  ensureAnalysis: async ({
    chapterId,
    bookId,
    bookTitle,
    chapterTitle,
    chapterPlainText,
    force,
  }) => {
    if (!chapterId) return;

    const existing = get().analysisByChapter[chapterId];
    if (
      !force &&
      existing &&
      (existing.status === "loading" || existing.status === "ready")
    ) {
      return;
    }

    const requestId = ++_analysisRequestId;

    set((s) => ({
      analysisByChapter: {
        ...s.analysisByChapter,
        [chapterId]: {
          status: "loading",
          characters: existing?.characters ?? [],
          error: undefined,
        },
      },
    }));

    try {
      const characters = await analyzeChapterForRoleplay({
        bookId,
        bookTitle,
        chapterId,
        chapterTitle,
        bookContent: chapterPlainText,
      });

      if (_analysisRequestId !== requestId) return;

      set((s) => ({
        analysisByChapter: {
          ...s.analysisByChapter,
          [chapterId]: { status: "ready", characters, error: undefined },
        },
        selectedCharacterByChapter: (() => {
          const current = s.selectedCharacterByChapter[chapterId];
          if (
            current &&
            characters.some((c) => c.name === current)
          ) {
            return s.selectedCharacterByChapter;
          }
          return {
            ...s.selectedCharacterByChapter,
            [chapterId]: characters[0]?.name ?? null,
          };
        })(),
      }));
    } catch (error) {
      if (_analysisRequestId !== requestId) return;

      const message =
        error instanceof Error
          ? error.message
          : "交互式聊天初始化失败，请稍后重试";

      set((s) => ({
        analysisByChapter: {
          ...s.analysisByChapter,
          [chapterId]: { status: "error", characters: [], error: message },
        },
      }));
    }
  },

  sendMessage: async ({
    chatSessionKey,
    character,
    bookTitle,
    chapterTitle,
    chapterPlainText,
    text,
  }) => {
    const { messagesBySession } = get();
    const existingMessages = messagesBySession[chatSessionKey] ?? [];

    const userMessage: RoleplayChatHistoryMessage = {
      role: "user",
      content: text,
    };
    const nextHistory = [...existingMessages, userMessage];

    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [chatSessionKey]: nextHistory,
      },
      errorBySession: { ...s.errorBySession, [chatSessionKey]: undefined },
      isChatSending: true,
    }));

    try {
      const response = await sendRoleplayMessageService({
        character,
        bookTitle,
        chapterTitle,
        chapterContentOrSummary: chapterPlainText,
        targetLanguage: "ja-JP",
        userProficiencyLevel: "B1 - Intermediate",
        message: text,
        history: existingMessages,
      });

      const assistantMessage: RoleplayChatHistoryMessage = {
        role: "assistant",
        content: response.reply,
      };

      set((s) => ({
        messagesBySession: {
          ...s.messagesBySession,
          [chatSessionKey]: [...nextHistory, assistantMessage],
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "发送消息失败，请稍后重试";
      set((s) => ({
        errorBySession: { ...s.errorBySession, [chatSessionKey]: message },
      }));
    } finally {
      set({ isChatSending: false });
    }
  },
}));

// ── Stable fallback constants (avoid new-reference-per-render) ──

const IDLE_ANALYSIS: RoleplayAnalysisState = {
  status: "idle",
  characters: [],
  error: undefined,
};
const EMPTY_MESSAGES: RoleplayChatHistoryMessage[] = [];

// ── Derived selectors ──

/** Get the analysis state for a specific chapter */
export function useChapterAnalysis(
  chapterId: string
): RoleplayAnalysisState {
  return useRoleplayStore(
    (s) => s.analysisByChapter[chapterId] ?? IDLE_ANALYSIS
  );
}

/** Get the selected character for a specific chapter */
export function useSelectedCharacter(chapterId: string): string | null {
  return useRoleplayStore(
    (s) => s.selectedCharacterByChapter[chapterId] ?? null
  );
}

/** Get chat messages for a specific session key */
export function useChatMessages(
  sessionKey: string | null
): RoleplayChatHistoryMessage[] {
  return useRoleplayStore((s) =>
    sessionKey ? s.messagesBySession[sessionKey] ?? EMPTY_MESSAGES : EMPTY_MESSAGES
  );
}

/** Get chat error for a specific session key */
export function useChatError(
  sessionKey: string | null
): string | undefined {
  return useRoleplayStore((s) =>
    sessionKey ? s.errorBySession[sessionKey] : undefined
  );
}

/**
 * Convenience hook that bundles the commonly used roleplay handlers,
 * memoized with stable references via getState().
 */
export function useRoleplayActions() {
  const ensureAnalysis = useCallback(
    (params: Parameters<RoleplayState["ensureAnalysis"]>[0]) =>
      useRoleplayStore.getState().ensureAnalysis(params),
    []
  );
  const sendMessage = useCallback(
    (params: Parameters<RoleplayState["sendMessage"]>[0]) =>
      useRoleplayStore.getState().sendMessage(params),
    []
  );
  const setSelectedCharacter = useCallback(
    (chapterId: string, name: string) =>
      useRoleplayStore.getState().setSelectedCharacter(chapterId, name),
    []
  );
  const retryAnalysis = useCallback(
    (params: Parameters<RoleplayState["ensureAnalysis"]>[0]) =>
      useRoleplayStore.getState().ensureAnalysis({ ...params, force: true }),
    []
  );

  return { ensureAnalysis, sendMessage, setSelectedCharacter, retryAnalysis };
}
