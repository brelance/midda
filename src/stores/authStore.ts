import { create } from "zustand";
import type { AuthUser } from "../index.d";

const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  startOAuth: (provider: "google" | "apple") => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  startOAuth: async (provider) => {
    try {
      await window.api.auth.startOAuth(provider);
      // The actual login result comes via the auth:state-change event
    } catch (err) {
      console.error("[authStore] OAuth start failed:", err);
    }
  },

  logout: async () => {
    try {
      await window.api.auth.logout();
      set({ user: null, isAuthenticated: false });
      stopRefreshTimer();
    } catch (err) {
      console.error("[authStore] Logout failed:", err);
    }
  },

  loadSession: async () => {
    set({ isLoading: true });
    try {
      // Try restoring persisted session
      const user = await window.api.auth.restoreSession();
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false });
        startRefreshTimer();
        return;
      }

      // Fallback: check current Supabase session
      const session = await window.api.auth.getSession();
      set({
        user: session.user,
        isAuthenticated: session.isAuthenticated,
        isLoading: false,
      });
      if (session.isAuthenticated) {
        startRefreshTimer();
      }
    } catch (err) {
      console.error("[authStore] loadSession failed:", err);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// ── Token refresh timer (A2) ────────────────────────────────────────────────

let refreshTimerId: ReturnType<typeof setInterval> | null = null;

function startRefreshTimer(): void {
  if (refreshTimerId) return;
  refreshTimerId = setInterval(async () => {
    try {
      const result = await window.api.auth.refreshSession();
      if (result) {
        useAuthStore.setState({
          user: result as AuthUser,
          isAuthenticated: true,
        });
      }
    } catch (err) {
      console.warn("[authStore] Periodic token refresh failed:", err);
    }
  }, TOKEN_REFRESH_INTERVAL_MS);
  console.log("[authStore] Token refresh timer started (every 50 min)");
}

function stopRefreshTimer(): void {
  if (refreshTimerId) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
    console.log("[authStore] Token refresh timer stopped");
  }
}

// ── Auth state change listener (call once at app startup) ────────────────────

let unsubscribe: (() => void) | null = null;

export function initAuthListener(): void {
  if (unsubscribe) return;

  unsubscribe = window.api.auth.onAuthStateChange((user) => {
    useAuthStore.setState({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
    // Start/stop timer based on auth state
    if (user) {
      startRefreshTimer();
    } else {
      stopRefreshTimer();
    }
  });
}

export function cleanupAuthListener(): void {
  unsubscribe?.();
  unsubscribe = null;
  stopRefreshTimer();
}
