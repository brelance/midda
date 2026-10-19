import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';

export default function BackendLoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const login = useAuthStore(s => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await login(identifier.trim(), password); setPassword(''); onSuccess?.(); }
    catch (err) { setError(err instanceof Error ? err.message : '登录失败，请稍后重试。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-[13px] leading-relaxed text-[#86868b]">使用后端已有的邮箱或手机号账号登录，阅读器与社区共用同一会话。</p>
    <label className="block text-[13px] text-[#555]">邮箱 / 手机号<input required disabled={busy} autoComplete="username" maxLength={254} value={identifier} onChange={e => setIdentifier(e.target.value)} className="block w-full mt-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 outline-blue-500" /></label>
    <label className="block text-[13px] text-[#555]">密码<input required disabled={busy} type="password" autoComplete="current-password" maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="block w-full mt-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 outline-blue-500" /></label>
    {error && <p role="alert" className="text-[12px] text-red-600 leading-relaxed">{error}</p>}
    <button disabled={busy || !identifier.trim() || !password} className="w-full rounded-xl bg-[#007aff] px-4 py-3 text-white text-[14px] font-medium disabled:opacity-50">{busy ? '登录中…' : '登录 Midda'}</button>
    <p className="text-[11px] text-[#86868b]">暂不提供注册和密码找回入口，请先在后端完成账号注册。</p>
  </form>;
}
