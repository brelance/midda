import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import BackendLoginForm from '../components/sidebar/BackendLoginForm';

export default function AccountPage() {
  const { user, isLoading, logout } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); }
    catch (err) { setError(err instanceof Error ? err.message : '退出失败'); }
    finally { setBusy(false); }
  }
  return <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto bg-[#f8f9fb]">
    <section className="w-full max-w-[420px] rounded-2xl p-8 bg-white border border-black/[0.06] shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center text-white text-2xl font-bold">M</div>
      <h1 className="text-center text-xl font-semibold mb-6">{user ? user.name : '欢迎使用 Midda'}</h1>
      {error && <p role="alert" className="text-red-600 text-[12px] mb-4">{error}</p>}
      {isLoading ? <p role="status" className="text-center text-gray-500">正在恢复登录…</p> : user ? <>
        <dl className="text-[13px] space-y-4 mb-8 break-all"><div><dt className="text-gray-400">登录方式</dt><dd>后端 JWT</dd></div>{user.email && <div><dt className="text-gray-400">邮箱</dt><dd>{user.email}</dd></div>}<div><dt className="text-gray-400">用户 ID</dt><dd>{user.id}</dd></div></dl>
        <p className="text-[12px] text-gray-400 mb-5">此账号已用于社区互动。本地书库仍保存在当前设备，不会因登录自动上传或同步。</p>
        <button disabled={busy} onClick={() => void signOut()} className="w-full rounded-xl bg-red-50 text-red-600 py-3 text-sm disabled:opacity-50">{busy ? '退出中…' : '退出登录'}</button>
      </> : <BackendLoginForm />}
    </section>
  </main>;
}
