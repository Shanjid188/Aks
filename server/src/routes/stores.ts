import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { parseJsonSafe } from '../utils/json.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

function storeToApi(s: { features: string; [k: string]: unknown }) {
  return { ...s, features: parseJsonSafe<string[]>(s.features, []) };
}

/** Public: list all AKS Mart store locations. */
router.get(
  '/stores',
  asyncHandler(async (_req, res) => {
    const stores = await prisma.store.findMany({ orderBy: [{ isFlagship: 'desc' }, { name: 'asc' }] });
    res.json({ stores: stores.map(storeToApi) });
  })
);

/* =========================== ADMIN STORE CRUD =========================== */

router.get(
  '/admin/stores',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const stores = await prisma.store.findMany({ orderBy: { name: 'asc' } });
    res.json({ stores: stores.map(storeToApi) });
  })
);

router.post(
  '/admin/stores',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.name || !body.division || !body.address) {
      return res.status(400).json({ error: 'name, division and address are required' });
    }
    try {
      const store = await prisma.store.create({
        data: {
          name: String(body.name),
          division: String(body.division),
          district: String(body.district || ''),
          area: String(body.area || ''),
          address: String(body.address),
          phone: String(body.phone || ''),
          openingHours: String(body.openingHours || ''),
          features: JSON.stringify(Array.isArray(body.features) ? body.features : []),
          lat: Number(body.lat) || 0,
          lng: Number(body.lng) || 0,
          isFlagship: Boolean(body.isFlagship ?? false),
        },
      });
      res.status(201).json({ store: storeToApi(store) });
    } catch {
      res.status(409).json({ error: 'A store with this name already exists' });
    }
  })
);

router.patch(
  '/admin/stores/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Store not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const keys: (keyof typeof body)[] = ['name', 'division', 'district', 'area', 'address', 'phone', 'openingHours'];
    for (const key of keys) {
      if (body[key] !== undefined) data[key] = String(body[key]);
    }
    if (body.features !== undefined) data.features = JSON.stringify(body.features ?? []);
    if (body.lat !== undefined) data.lat = Number(body.lat);
    if (body.lng !== undefined) data.lng = Number(body.lng);
    if (body.isFlagship !== undefined) data.isFlagship = Boolean(body.isFlagship);

    const store = await prisma.store.update({ where: { id }, data });
    res.json({ store: storeToApi(store) });
  })
);

router.delete(
  '/admin/stores/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Store not found' });
    await prisma.store.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;