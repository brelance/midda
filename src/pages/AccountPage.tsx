import React from "react";
import { useAuthStore } from "../stores/authStore";

/* ────────────────────────────────────────────────────────────────────────── */
/*  SVG Icons                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Login View                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const LoginView: React.FC = () => {
  const startOAuth = useAuthStore((s) => s.startOAuth);
  const [loadingProvider, setLoadingProvider] = React.useState<string | null>(
    null
  );

  const handleLogin = async (provider: "google" | "apple") => {
    setLoadingProvider(provider);
    try {
      await startOAuth(provider);
    } finally {
      // Browser is now open — clear loading immediately.
      // Auth state update will come via the onAuthStateChange listener.
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="w-full max-w-[380px] rounded-2xl p-8
          bg-white/60 backdrop-blur-xl
          border border-black/[0.06]
          shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl
              bg-gradient-to-br from-[#007aff] to-[#5856d6]
              flex items-center justify-center
              shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
          >
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-xl font-semibold text-[#1d1d1f] mb-1">
            欢迎使用 Midda
          </h1>
          <p className="text-[13px] text-[#86868b]">登录以同步你的阅读数据</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            id="login-google"
            onClick={() => void handleLogin("google")}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3
              h-11 rounded-xl border border-black/[0.08]
              bg-white hover:bg-gray-50
              text-[14px] font-medium text-[#1d1d1f]
              transition-all duration-150
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm hover:shadow-md"
          >
            {loadingProvider === "google" ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            Continue with Google
          </button>

          <button
            id="login-apple"
            onClick={() => void handleLogin("apple")}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3
              h-11 rounded-xl border border-transparent
              bg-[#1d1d1f] hover:bg-[#333]
              text-[14px] font-medium text-white
              transition-all duration-150
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm hover:shadow-md"
          >
            {loadingProvider === "apple" ? (
              <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            ) : (
              <AppleIcon className="w-5 h-5" />
            )}
            Continue with Apple
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#86868b] mt-6 leading-relaxed">
          登录即表示你同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Profile View                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

const ProfileView: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loggingOut, setLoggingOut] = React.useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  const providerLabel =
    user.provider === "google"
      ? "Google"
      : user.provider === "apple"
        ? "Apple"
        : user.provider;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="w-full max-w-[420px] rounded-2xl p-8
          bg-white/60 backdrop-blur-xl
          border border-black/[0.06]
          shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
      >
        {/* Avatar & Name */}
        <div className="flex flex-col items-center mb-6">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover
                ring-4 ring-white shadow-lg mb-4"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full
                bg-gradient-to-br from-[#007aff] to-[#5856d6]
                flex items-center justify-center
                ring-4 ring-white shadow-lg mb-4"
            >
              <span className="text-white text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h2 className="text-lg font-semibold text-[#1d1d1f]">{user.name}</h2>
          <p className="text-[13px] text-[#86868b]">{user.email}</p>
        </div>

        {/* Info Cards */}
        <div
          className="rounded-xl border border-black/[0.06] overflow-hidden
            divide-y divide-black/[0.04] mb-6"
        >
          <InfoRow label="登录方式" value={providerLabel} />
          <InfoRow label="用户 ID" value={user.id.slice(0, 8) + "..."} />
        </div>

        {/* Logout Button */}
        <button
          id="btn-logout"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="w-full h-11 rounded-xl
            bg-red-50 hover:bg-red-100
            text-red-600 text-[14px] font-medium
            transition-all duration-150
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between px-4 py-3 bg-white/40">
    <span className="text-[13px] text-[#86868b]">{label}</span>
    <span className="text-[13px] font-medium text-[#1d1d1f]">{value}</span>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Account Page                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

const AccountPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#007aff] rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <ProfileView /> : <LoginView />;
};

export default AccountPage;
