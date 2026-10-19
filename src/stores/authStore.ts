import { create } from 'zustand';
import type { AuthUser } from '../index.d';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}
let authRevision = 0;
export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isLoading: true,
  login: async (identifier, password) => {
    authRevision++;
    const user = await window.api.auth.login(identifier, password);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  logout: async () => {
    authRevision++;
    try { await window.api.auth.logout(); }
    finally { set({ user: null, isAuthenticated: false, isLoading: false }); }
  },
  loadSession: async () => {
    const revision = authRevision;
    set({ isLoading: true });
    try {
      const user = await window.api.auth.restoreSession();
      if (revision === authRevision) set({ user, isAuthenticated: !!user, isLoading: false });
    } catch {
      // An offline restore does not remove encrypted credentials in the main process.
      if (revision === authRevision) set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
let unsubscribe: (() => void) | null = null;
export function initAuthListener() {
  if (unsubscribe || !window.api?.auth) return;
  unsubscribe = window.api.auth.onAuthStateChange(user => {
    authRevision++;
    useAuthStore.setState({ user, isAuthenticated: !!user, isLoading: false });
  });
}
export function cleanupAuthListener() { unsubscribe?.(); unsubscribe = null; }
