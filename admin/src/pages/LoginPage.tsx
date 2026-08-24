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
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5 border border-neutral-200"
      >
        <div className="text-center space-y-1">
                    <img src={aksLogo} alt="AKS Mart" className="w-12 h-12 rounded-xl object-cover mx-auto shrink-0" />
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">AKS Mart Admin</h1>
          <p className="text-xs text-neutral-400">Management console</p>
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
          Default seeded admin — <span className="font-semibold text-neutral-500">admin@aksgarments.com.bd</span> /{' '}
          <span className="font-semibold text-neutral-500">Admin@123</span>
        </p>
      </form>
    </div>
  );
}