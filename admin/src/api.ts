const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

const TOKEN_KEY = 'aks_admin_token';
const ADMIN_KEY = 'aks_admin_profile';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredAdmin(): AdminUser | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: AdminUser | null): void {
  if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  else localStorage.removeItem(ADMIN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    setStoredAdmin(null);
    window.dispatchEvent(new Event('aks-admin-unauthorized'));
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  /** Role display name (e.g. "Super Admin") or the legacy label fallback. */
  role: string;
  roleId: string | null;
  isSuper: boolean;
  /** Flat permission keys — drives sidebar / buttons (UX only). */
  permissions: string[];
}