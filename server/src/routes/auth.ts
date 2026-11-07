import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { comparePassword, currentAdmin, loadAdminAuth, requireAuth, signToken } from '../lib/auth.ts';
import { asyncHandler } from '../lib/auth.ts';
import { clientKey, createThrottle } from '../lib/throttle.ts';

const router = Router();

/**
 * Failed sign-ins per client address. Slows password guessing without
 * letting anyone lock a real admin out by failing logins for their email.
 */
const failedLogins = createThrottle({ windowMs: 15 * 60 * 1000, max: 10 });

router.post(
  '/admin/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = (req.body || {}) as Record<string, unknown>;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const client = clientKey(req);
    if (failedLogins.isBlocked(client)) {
      return res.status(429).json({ error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.' });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      failedLogins.record(client);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await comparePassword(String(password), admin.passwordHash);
    if (!ok) {
      failedLogins.record(client);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Build the permission-enriched admin payload (role changes apply immediately).
    const auth = await loadAdminAuth(admin.id);
    if (!auth) {
      return res.status(403).json({ error: 'Account disabled' });
    }

    const token = signToken({
      id: auth.id,
      email: auth.email,
      role: auth.role,
      roleId: auth.roleId,
      isSuper: auth.isSuper,
      name: auth.name,
      permissions: auth.permissions,
    }, admin.passwordHash);

    res.json({ token, admin: auth });
  })
);

router.get(
  '/admin/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = currentAdmin(req);
    const auth = await loadAdminAuth(payload.id);
    if (!auth) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: auth });
  })
);

export default router;