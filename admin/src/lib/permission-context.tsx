import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AdminUser } from '../api';
import { hasPerm } from './permissions';

/**
 * Central RBAC access for the admin panel.
 *
 * The permission *data* comes from the backend login response (see `AdminUser`
 * in `../api`, persisted to localStorage and restored by `App`). This module
 * only distributes it — all decision logic stays in `hasPerm`, which remains
 * the single source of truth shared with the server catalog.
 *
 * Pages consume it via `usePermission()` / `useCan()` so no page has to fetch
 * `/admin/auth/me` or re-implement the Super Admin bypass.
 *
 *   const can = useCan();
 *   {can(PERM.PRODUCTS_CREATE) && <button>New Product</button>}
 *
 * Always test by permission key — never by role name.
 */
export interface PermissionContextValue {
  /** The logged-in admin, or null before login. */
  admin: AdminUser | null;
  /** True when the admin holds `permission` (Super Admin always passes). */
  can: (permission: string) => boolean;
  /** True when the admin holds every permission in the list. */
  canAll: (permissions: string[]) => boolean;
  /** True when the admin holds at least one permission in the list. */
  canAny: (permissions: string[]) => boolean;
  /** Convenience flag for UI copy/affordances. */
  isSuper: boolean;
  /** Flat permission keys exactly as returned by the backend. */
  permissions: string[];
}

/**
 * Defaults deny everything, so a component rendered outside the provider
 * (e.g. a stray test mount) fails closed instead of leaking controls.
 */
const PermissionContext = createContext<PermissionContextValue>({
  admin: null,
  can: () => false,
  canAll: () => false,
  canAny: () => false,
  isSuper: false,
  permissions: [],
});

export function PermissionProvider({
  admin,
  children,
}: {
  admin: AdminUser | null;
  children: ReactNode;
}) {
  const value = useMemo<PermissionContextValue>(
    () => ({
      admin,
      can: (permission) => hasPerm(admin, permission),
      canAll: (permissions) => permissions.every((p) => hasPerm(admin, p)),
      canAny: (permissions) => permissions.some((p) => hasPerm(admin, p)),
      isSuper: Boolean(admin?.isSuper),
      permissions: admin?.permissions ?? [],
    }),
    [admin]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/** Full access to the admin + permission helpers. */
export function usePermission(): PermissionContextValue {
  return useContext(PermissionContext);
}

/** Just the `can(permission)` checker — the common case inside a page. */
export function useCan(): (permission: string) => boolean {
  return useContext(PermissionContext).can;
}