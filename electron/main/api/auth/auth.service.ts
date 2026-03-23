import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";
import { shell, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

// ── Config (injected at build time by Vite `define` — see vite.config.ts) ────

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const SUPABASE_URL = __SUPABASE_URL__;
const SUPABASE_ANON_KEY = __SUPABASE_ANON_KEY__;
const REDIRECT_URL = "midda://auth-callback";

console.log("[AuthService] SUPABASE_URL:", SUPABASE_URL ? "✓ set" : "✗ EMPTY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[AuthService] SUPABASE_URL or SUPABASE_ANON_KEY not set — auth will not work."
  );
}

// ── Token persistence using safeStorage ──────────────────────────────────────

let _tokenFilePath: string | null = null;
function getTokenFilePath(): string {
  if (!_tokenFilePath) {
    _tokenFilePath = path.join(app.getPath("userData"), ".auth-tokens");
  }
  return _tokenFilePath;
}

function persistTokens(session: Session): void {
  try {
    const data = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(data);
      fs.writeFileSync(getTokenFilePath(), encrypted);
    } else {
      console.warn(
        "[AuthService] ⚠ safeStorage not available — tokens stored in plaintext."
      );
      fs.writeFileSync(getTokenFilePath(), data, "utf-8");
    }
  } catch (err) {
    console.error("[AuthService] Failed to persist tokens:", err);
  }
}

function loadPersistedTokens(): {
  access_token: string;
  refresh_token: string;
} | null {
  try {
    if (!fs.existsSync(getTokenFilePath())) return null;
    const raw = fs.readFileSync(getTokenFilePath());
    let data: string;
    if (safeStorage.isEncryptionAvailable()) {
      data = safeStorage.decryptString(raw);
    } else {
      data = raw.toString("utf-8");
    }
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function clearPersistedTokens(): void {
  try {
    if (fs.existsSync(getTokenFilePath())) {
      fs.unlinkSync(getTokenFilePath());
    }
  } catch {
    // ignore
  }
}

// ── In-memory storage for Supabase SDK (PKCE code_verifier, etc.) ────────────

const memoryStore: Record<string, string> = {};

const supabaseStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => { memoryStore[key] = value; },
  removeItem: (key: string) => { delete memoryStore[key]; },
};

// ── Supabase client ──────────────────────────────────────────────────────────

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // We handle session persistence ourselves
        detectSessionInUrl: false,
        flowType: "pkce",
        storage: supabaseStorage, // Explicit storage keeps code_verifier safe
      },
    });
  }
  return supabase;
}

// ── Auth user type (renderer-safe, no secrets) ───────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

function mapUser(user: User, provider?: string): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    name: meta.full_name ?? meta.name ?? user.email ?? "User",
    avatar: meta.avatar_url ?? meta.picture,
    provider: provider ?? user.app_metadata?.provider ?? "unknown",
  };
}

// ── State change callback ────────────────────────────────────────────────────

type AuthStateCallback = (user: AuthUser | null) => void;
let onStateChange: AuthStateCallback | null = null;

export function setAuthStateCallback(cb: AuthStateCallback): void {
  onStateChange = cb;
}

function notifyStateChange(user: AuthUser | null): void {
  onStateChange?.(user);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function startOAuthFlow(
  provider: "google" | "apple"
): Promise<void> {
  const sb = getSupabase();

  // SDK handles PKCE internally (code_verifier stored in memory)
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true, // We open it ourselves with shell.openExternal
    },
  });

  if (error) {
    console.error("[AuthService] OAuth initiation error:", error.message);
    throw new Error("OAuth 登录启动失败，请稍后再试");
  }

  if (data.url) {
    console.log("[AuthService] Opening OAuth URL in system browser");
    await shell.openExternal(data.url);
  }
}

export async function handleAuthCallback(url: string): Promise<AuthUser | null> {
  try {
    console.log("[AuthService] Handling auth callback:", url);
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");

    if (!code) {
      console.warn("[AuthService] No code in callback URL:", url);
      return null;
    }

    const sb = getSupabase();
    // SDK uses the internally stored code_verifier from the PKCE flow
    const { data, error } = await sb.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[AuthService] Code exchange error:", error.message);
      return null;
    }

    if (data.session) {
      persistTokens(data.session);
      const user = mapUser(data.session.user);
      console.log("[AuthService] Login successful:", user.email);
      notifyStateChange(user);
      return user;
    }

    return null;
  } catch (err) {
    console.error("[AuthService] handleAuthCallback error:", err);
    return null;
  }
}

export async function getSession(): Promise<{
  user: AuthUser | null;
  isAuthenticated: boolean;
}> {
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (session?.user) {
    return { user: mapUser(session.user), isAuthenticated: true };
  }

  return { user: null, isAuthenticated: false };
}

export async function restoreSession(): Promise<AuthUser | null> {
  const tokens = loadPersistedTokens();
  if (!tokens) return null;

  const sb = getSupabase();
  const { data, error } = await sb.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error) {
    console.warn("[AuthService] Failed to restore session:", error.message);
    // Only clear tokens if the error indicates an invalid/expired refresh token.
    // Transient network errors or Supabase outages should NOT wipe the session.
    const status = (error as { status?: number }).status;
    if (status === 400 || status === 401 || status === 403) {
      clearPersistedTokens();
    }
    return null;
  }

  if (data.session) {
    // Persist refreshed tokens
    persistTokens(data.session);
    const user = mapUser(data.session.user);
    notifyStateChange(user);
    return user;
  }

  return null;
}

export async function refreshSession(): Promise<AuthUser | null> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.refreshSession();

  if (error) {
    console.warn("[AuthService] Refresh failed:", error.message);
    return null;
  }

  if (data.session) {
    persistTokens(data.session);
    const user = mapUser(data.session.user);
    notifyStateChange(user);
    return user;
  }

  return null;
}

export async function logout(): Promise<void> {
  const sb = getSupabase();
  await sb.auth.signOut();
  clearPersistedTokens();
  notifyStateChange(null);
}
