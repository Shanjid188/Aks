// Thin fetch wrappers for talking to the test server. The node test runner
// gives every test file its own process, so the base URL is per-file state
// provided by useTestServer().
import { ADMINS, type AdminRole } from './db.ts';

let baseUrl: Promise<string> | undefined;

/**
 * Registered synchronously by useTestServer(). File-level before() hooks are
 * not awaited one after another, so requests wait on this instead of relying
 * on hook order.
 */
export function setBaseUrl(url: Promise<string>): void {
  url.catch(() => {}); // the failing before() hook reports the error
  baseUrl = url;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

async function request<T>(method: string, path: string, token?: string, body?: unknown): Promise<ApiResponse<T>> {
  if (!baseUrl) throw new Error('Test server not started: call useTestServer() in this test file');
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${await baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body (e.g. robots.txt) — return the raw text
  }
  return { status: res.status, body: parsed as T };
}

/** Log in as one of the seeded admins and return the bearer token. */
export async function login(role: AdminRole): Promise<string> {
  const { email, password } = ADMINS[role];
  const res = await request<{ token?: string }>('POST', '/api/admin/auth/login', undefined, { email, password });
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Login as ${role} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

/** Request helpers bound to a token (omit it for public endpoints). */
export function api(token?: string) {
  return {
    get: <T = any>(path: string) => request<T>('GET', path, token),
    post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, token, body),
    patch: <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, token, body),
    put: <T = any>(path: string, body?: unknown) => request<T>('PUT', path, token, body),
    delete: <T = any>(path: string) => request<T>('DELETE', path, token),
  };
}
