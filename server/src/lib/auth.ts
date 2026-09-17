import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.ts';
import { ALL_PERMISSIONS } from './permissions.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'aks-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
  roleId: string | null;
  isSuper: boolean;
  name: string;
  permissions: string[];
}

export function signToken(payload: AdminPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AdminPayload {
  return jwt.verify(token, JWT_SECRET) as AdminPayload;
}

/** Express request augmented with the decoded + permission-enriched admin. */
export interface AdminRequest extends Request {
  admin?: AdminPayload;
}

export function currentAdmin(req: Request): AdminPayload {
  return (req as AdminRequest).admin as AdminPayload;
}

/**
 * Load a fresh permission snapshot for an admin straight from the DB.
 * Every protected request hits this so role/permission changes take effect
 * immediately (no stale JWT permissions).
 */
export async function loadAdminAuth(adminId: string): Promise<AdminPayload | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    include: { roleRef: { include: { permissions: { select: { permission: true } } } } },
  });
  if (!admin || !admin.isActive) return null;

  const role = admin.roleRef;
  const isSuper = role?.isSuper ?? false;
  const permissions = isSuper ? ALL_PERMISSIONS : (role?.permissions ?? []).map((p) => p.permission);

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: role?.name || admin.role,
    roleId: role?.id ?? null,
    isSuper,
    permissions,
  };
}

/** Middleware: requires a valid Bearer token for any admin route. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    (req as AdminRequest).admin = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: requires the authenticated admin to hold `permission`.
 * Super Admin bypasses all checks. Uses fresh DB state on every request.
 * Authenticates the Bearer token itself, so it can be used standalone.
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Authenticate first (works standalone or after requireAuth).
    if (!currentAdmin(req)) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      try {
        (req as AdminRequest).admin = verifyToken(token);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
    const tokenAdmin = currentAdmin(req);
    try {
      const fresh = await loadAdminAuth(tokenAdmin.id);
      if (!fresh) {
        return res.status(403).json({ error: 'Account disabled or not found' });
      }
      (req as AdminRequest).admin = fresh;
      if (fresh.isSuper || fresh.permissions.includes(permission)) {
        return next();
      }
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Fresh-permission check for use INSIDE handlers when the required permission
 * depends on runtime state (e.g. order cancel vs. status change).
 * Reloads the admin's permissions from the DB, so role changes apply instantly.
 */
export async function hasPermission(req: Request, permission: string): Promise<boolean> {
  const tokenAdmin = currentAdmin(req);
  if (!tokenAdmin) return false;
  try {
    const fresh = await loadAdminAuth(tokenAdmin.id);
    if (!fresh) return false;
    (req as AdminRequest).admin = fresh;
    return fresh.isSuper || fresh.permissions.includes(permission);
  } catch {
    return false;
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = currentAdmin(req);
  if (!admin || !admin.isSuper) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

/** Async route wrapper so rejected promises reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}