import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { comparePassword, currentAdmin, requireAuth, signToken } from '../lib/auth.ts';
import { asyncHandler } from '../lib/auth.ts';

const router = Router();

router.post(
  '/admin/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = (req.body || {}) as Record<string, unknown>;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await comparePassword(String(password), admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  })
);

router.get(
  '/admin/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = currentAdmin(req);
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.id } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  })
);

export default router;