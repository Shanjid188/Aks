import React, { useState } from 'react';
import { api, setStoredAdmin, setToken, type AdminUser } from '../api';
import { Button, Field, TextInput } from '../components/ui';
import aksLogo from '../assets/AKS.logo.jpg';

export function LoginPage({ onSuccess }: { onSuccess: (admin: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ token: string; admin: AdminUser }>('/admin/auth/login', { email, password });
      setToken(res.token);
      setStoredAdmin(res.admin);
      onSuccess(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1d0609] via-[#5c1017] to-[#7f1d1d] px-4 relative overflow-hidden">
      {/* Ambient red glow decorations */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D8232A]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-rose-500/20 blur-3xl" />

      <form
        onSubmit={submit}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5 border border-neutral-200"
      >
        <div className="text-center space-y-1">
                    <img src={aksLogo} alt="AKS Mart" className="w-14 h-14 rounded-xl object-cover mx-auto shrink-0 ring-2 ring-[#D8232A]/40" />
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">AKS Mart Admin</h1>
          <p className="text-xs text-neutral-400">Management console</p>
          <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-[#D8232A] to-rose-500 text-white px-2.5 py-1 rounded-full">
            Control Panel
          </span>
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <Field label="Email address">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@aksgarments.com.bd"
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>

        <Button type="submit" disabled={loading} className="w-full py-3 text-sm">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-[11px] text-center text-neutral-400 leading-relaxed">
          Authorised staff only. Credentials are issued by the store owner —{' '}
          <span className="font-semibold text-neutral-500">see docs/DEPLOY_VPS.md</span>.
        </p>
      </form>
    </div>
  );
}