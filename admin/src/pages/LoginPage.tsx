import React, { useState } from 'react';
import { api, setStoredAdmin, setToken, type AdminUser } from '../api';
import { Button, Field, PasswordInput, TextInput } from '../components/ui';
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
    <div className="min-h-svh bg-white lg:grid lg:grid-cols-2">
      {/* LEFT — branding panel (hidden below lg, compact strip shows instead) */}
      <section className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#F7FBFA] via-white to-[#EFF7F5] px-10 py-14 xl:px-16">
        {/* Decorative background — soft curves and circles, brand + teal tints */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-[#D8232A]/[0.07] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -right-20 w-[24rem] h-[24rem] rounded-full bg-teal-400/[0.12] blur-3xl" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 800" fill="none">
          <path d="M-40 250 C 140 190, 240 330, 420 280 S 640 200, 700 260" stroke="#D8232A" strokeOpacity="0.08" strokeWidth="1.5" />
          <path d="M-40 620 C 160 560, 300 700, 460 640 S 660 570, 700 600" stroke="#14B8A6" strokeOpacity="0.12" strokeWidth="1.5" />
          <circle cx="520" cy="120" r="70" stroke="#D8232A" strokeOpacity="0.07" strokeWidth="1.5" />
          <circle cx="80" cy="700" r="46" stroke="#14B8A6" strokeOpacity="0.12" strokeWidth="1.5" />
        </svg>

        <div className="relative max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3">
            <img src={aksLogo} alt="AKS Mart" className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-black/5 shadow-sm" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Admin Portal</p>
              <p className="text-xl font-black tracking-tight text-neutral-900 leading-tight">AKS MART</p>
            </div>
          </div>

          <h2 className="mt-9 text-[2.6rem] leading-[1.08] font-black tracking-tight text-neutral-900 xl:text-[3.1rem]">
            Manage Smarter.<br />
            <span className="bg-gradient-to-r from-[#D8232A] to-[#F0563D] bg-clip-text text-transparent">
              Grow Faster.
            </span>
          </h2>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500">
            Manage your products, orders, sales and business operations from one powerful platform.
          </p>
          {/* Original AKS illustration — abstract dashboard scene drawn in SVG.
              Deliberately generic (nothing copied) and fully decorative. */}
          <svg aria-hidden="true" viewBox="0 0 520 300" className="mt-12 w-full max-w-lg" fill="none">
            <defs>
              <linearGradient id="aksBar" x1="0" y1="1" x2="0" y2="0">
                <stop stopColor="#D8232A" stopOpacity="0.25" />
                <stop offset="1" stopColor="#D8232A" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="aksTeal" x1="0" y1="1" x2="0" y2="0">
                <stop stopColor="#14B8A6" stopOpacity="0.2" />
                <stop offset="1" stopColor="#14B8A6" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="aksSurface" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#F8FBFA" />
              </linearGradient>
              <filter id="aksSoft" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0F172A" floodOpacity="0.07" />
              </filter>
            </defs>

            {/* Main dashboard card */}
            <rect x="58" y="42" width="300" height="196" rx="14" fill="url(#aksSurface)" stroke="#E2E8F0" filter="url(#aksSoft)" />
            <path d="M58 76 H358" stroke="#E2E8F0" />
            <circle cx="78" cy="59" r="4" fill="#D8232A" fillOpacity="0.5" />
            <circle cx="92" cy="59" r="4" fill="#14B8A6" fillOpacity="0.45" />
            <rect x="108" y="55" width="62" height="8" rx="4" fill="#E2E8F0" />

            {/* Analytics bars */}
            <rect x="78" y="150" width="16" height="66" rx="5" fill="url(#aksBar)" />
            <rect x="104" y="126" width="16" height="90" rx="5" fill="url(#aksBar)" />
            <rect x="130" y="162" width="16" height="54" rx="5" fill="url(#aksBar)" />
            <rect x="156" y="106" width="16" height="110" rx="5" fill="url(#aksTeal)" />
            <rect x="182" y="142" width="16" height="74" rx="5" fill="url(#aksBar)" />
            <rect x="208" y="94" width="16" height="122" rx="5" fill="url(#aksTeal)" />
            <path d="M78 224 H236" stroke="#E2E8F0" strokeLinecap="round" />
            <rect x="262" y="104" width="76" height="10" rx="5" fill="#0F172A" fillOpacity="0.08" />
            <rect x="262" y="124" width="54" height="8" rx="4" fill="#D8232A" fillOpacity="0.75" />
            {/* Donut chart */}
            <circle cx="284" cy="168" r="16" stroke="#14B8A6" strokeOpacity="0.2" strokeWidth="6" />
            <path d="M284 152 a16 16 0 0 1 11.4 27.3" stroke="#14B8A6" strokeOpacity="0.8" strokeWidth="6" strokeLinecap="round" />
            <rect x="312" y="160" width="26" height="7" rx="3.5" fill="#0F172A" fillOpacity="0.1" />
            <rect x="312" y="172" width="18" height="6" rx="3" fill="#CBD5E1" />

            {/* Orders card */}
            <rect x="296" y="196" width="196" height="80" rx="12" fill="#FFFFFF" stroke="#E2E8F0" filter="url(#aksSoft)" />
            <circle cx="320" cy="220" r="9" fill="#D8232A" fillOpacity="0.12" />
            <path d="M316 220.5 L319 223.5 L324.5 217.5" stroke="#D8232A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="338" y="214" width="52" height="7" rx="3.5" fill="#0F172A" fillOpacity="0.12" />
            <rect x="338" y="227" width="34" height="6" rx="3" fill="#CBD5E1" />
            <rect x="400" y="212" width="44" height="16" rx="8" fill="#D8232A" fillOpacity="0.12" />
            <rect x="412" y="218" width="20" height="5" rx="2.5" fill="#D8232A" fillOpacity="0.7" />
            <circle cx="446" cy="252" r="7" fill="#14B8A6" fillOpacity="0.35" />
            <circle cx="466" cy="252" r="7" fill="#CBD5E1" />
            <circle cx="486" cy="252" r="7" fill="#CBD5E1" />

            {/* Product tile */}
            <rect x="24" y="204" width="132" height="86" rx="12" fill="#FFFFFF" stroke="#E2E8F0" filter="url(#aksSoft)" />
            <rect x="38" y="218" width="30" height="30" rx="8" fill="#D8232A" fillOpacity="0.1" />
            <path d="M45 226 H61 V238 H45 Z" stroke="#D8232A" strokeOpacity="0.55" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M45 226 L48 222 H58 L61 226" stroke="#D8232A" strokeOpacity="0.55" strokeWidth="1.6" strokeLinejoin="round" />
            <rect x="78" y="222" width="58" height="7" rx="3.5" fill="#0F172A" fillOpacity="0.1" />
            <rect x="78" y="235" width="40" height="6" rx="3" fill="#CBD5E1" />
            <rect x="38" y="260" width="98" height="7" rx="3.5" fill="#F1F5F9" />
            <rect x="38" y="260" width="64" height="7" rx="3.5" fill="#14B8A6" fillOpacity="0.5" />
          </svg>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2 text-[11px] font-semibold text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D8232A]" /> Real-time inventory
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Sales analytics
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" /> Order management
            </span>
          </div>
        </div>
      </section>
      {/* RIGHT — the login form (existing fields and logic, unchanged) */}
      <section className="relative flex flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:px-12 xl:px-20">
        {/* Soft corner tint so the white panel isn't flat */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(20,184,166,0.07),transparent_60%),radial-gradient(100%_80%_at_0%_100%,rgba(216,35,42,0.05),transparent_60%)]" />

        <div className="relative w-full max-w-[26rem] mx-auto">
          {/* Company identity — shown above the heading on every device */}
          <div className="mb-8 flex items-center gap-3.5 sm:mb-9">
            <img
              src={aksLogo}
              alt="AKS Mart"
              className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-1 ring-black/5 shadow-sm"
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                Admin Portal
              </p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-neutral-900 leading-none">
                AKS MART
              </p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl sm:text-[1.75rem] font-black tracking-tight text-neutral-900">Welcome Back</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Sign in to your AKS Mart Admin Panel</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
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
                  placeholder="admin@aksmartbd.com"
                />
              </Field>
              <Field label="Password">
                <PasswordInput
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-3 text-sm">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-[11px] text-center text-neutral-400 leading-relaxed pt-1">
              Authorised staff only. Credentials are issued by the store owner —{' '}
              <span className="font-semibold text-neutral-500">see docs/DEPLOY_VPS.md</span>.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}