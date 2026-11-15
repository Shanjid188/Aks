import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { parseMatchKeys, rematchAttributions } from '../lib/attribution.ts';

/**
 * Admin → Advertising → Campaigns. Campaigns are what orders (via UTM tags)
 * and ad spend are linked to. Every change re-links affected orders and is
 * audited.
 */
const router = Router();

export const CAMPAIGN_CHANNELS = ['meta', 'google', 'tiktok', 'email', 'sms', 'other'] as const;
const PLATFORMS = ['meta', 'google', 'tiktok'] as const;
const STATUSES = ['active', 'paused', 'archived'] as const;

class InputError extends Error {}

function text(v: unknown, field: string, max: number, required = false): string | null {
  if (v == null || v === '') {
    if (required) throw new InputError(`${field} is required`);
    return null;
  }
  if (typeof v !== 'string') throw new InputError(`${field} must be text`);
  const s = v.trim();
  if (!s) {
    if (required) throw new InputError(`${field} is required`);
    return null;
  }
  if (s.length > max) throw new InputError(`${field} must be at most ${max} characters`);
  return s;
}

function oneOf<T extends string>(v: unknown, list: readonly T[], field: string, fallback?: T): T | null {
  if (v == null || v === '') return fallback ?? null;
  if (!list.includes(v as T)) throw new InputError(`${field} must be one of: ${list.join(', ')}`);
  return v as T;
}

function date(v: unknown, field: string): Date | null {
  if (v == null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new InputError(`${field} is not a valid date`);
  return d;
}

function matchKeys(v: unknown): string {
  if (v == null) return '[]';
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\n,]/) : null;
  if (!list) throw new InputError('matchKeys must be a list');
  const keys = [...new Set(list.map((k) => String(k).trim().toLowerCase()).filter(Boolean))];
  if (keys.length > 30) throw new InputError('At most 30 match keys');
  if (keys.some((k) => k.length > 200)) throw new InputError('Match keys must be at most 200 characters');
  return JSON.stringify(keys);
}

/** Validated create/update data. `partial` keeps absent fields untouched. */
function campaignData(body: Record<string, unknown>, partial: boolean): Prisma.MarketingCampaignUncheckedUpdateInput {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const out: Prisma.MarketingCampaignUncheckedUpdateInput = {};
  if (!partial || has('name')) out.name = text(body.name, 'Name', 120, true)!;
  if (!partial || has('channel')) out.channel = oneOf(body.channel, CAMPAIGN_CHANNELS, 'Channel', 'other')!;
  if (!partial || has('platform')) out.platform = oneOf(body.platform, PLATFORMS, 'Platform');
  if (!partial || has('platformCampaignId')) {
    const id = text(body.platformCampaignId, 'Platform campaign ID', 64);
    if (id && !/^[A-Za-z0-9_-]+$/.test(id)) throw new InputError('Platform campaign ID may contain letters, digits, - and _ only');
    out.platformCampaignId = id;
  }
  if (!partial || has('platformAccountId')) out.platformAccountId = text(body.platformAccountId, 'Account ID', 64);
  if (!partial || has('matchKeys')) out.matchKeys = matchKeys(body.matchKeys);
  if (!partial || has('status')) out.status = oneOf(body.status, STATUSES, 'Status', 'active')!;
  if (!partial || has('objective')) out.objective = text(body.objective, 'Objective', 80);
  if (!partial || has('startDate')) out.startDate = date(body.startDate, 'Start date');
  if (!partial || has('endDate')) out.endDate = date(body.endDate, 'End date');
  if (!partial || has('notes')) out.notes = text(body.notes, 'Notes', 1000);
  return out;
}

function campaignToApi<T extends { matchKeys: string }>(c: T) {
  return { ...c, matchKeys: parseMatchKeys(c.matchKeys) };
}

async function withOrderCounts<T extends { id: string; matchKeys: string }>(campaigns: T[]) {
  const counts = await prisma.orderAttribution.groupBy({
    by: ['campaignId'],
    where: { touch: 'last', campaignId: { in: campaigns.map((c) => c.id) } },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.campaignId, c._count._all]));
  return campaigns.map((c) => ({ ...campaignToApi(c), lastTouchOrders: byId.get(c.id) ?? 0 }));
}

function handleInput(res: import('express').Response, err: unknown) {
  if (err instanceof InputError) return res.status(400).json({ error: err.message });
  // Unique (platform, platformCampaignId)
  if ((err as { code?: string })?.code === 'P2002') {
    return res.status(409).json({ error: 'A campaign with this platform campaign ID already exists' });
  }
  throw err;
}

router.get(
  '/admin/advertising/campaigns',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_VIEW),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' && (STATUSES as readonly string[]).includes(req.query.status) ? req.query.status : undefined;
    const campaigns = await prisma.marketingCampaign.findMany({
      where: status ? { status } : { status: { not: 'archived' } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ campaigns: await withOrderCounts(campaigns) });
  })
);

router.post(
  '/admin/advertising/campaigns',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_MANAGE),
  asyncHandler(async (req, res) => {
    let campaign;
    try {
      const data = campaignData((req.body ?? {}) as Record<string, unknown>, false);
      campaign = await prisma.marketingCampaign.create({
        data: { ...(data as Prisma.MarketingCampaignUncheckedCreateInput), createdBy: currentAdmin(req)?.email ?? null },
      });
    } catch (err) {
      return handleInput(res, err);
    }
    const relinked = await rematchAttributions(campaign.id);
    await logAudit({ admin: currentAdmin(req), action: 'campaign.created', entity: 'campaign', entityId: campaign.id, details: `${campaign.name} (${campaign.channel}); ${relinked} order touch(es) linked` });
    res.status(201).json({ campaign: (await withOrderCounts([campaign]))[0], relinked });
  })
);

router.patch(
  '/admin/advertising/campaigns/:id',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_MANAGE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    let campaign;
    let data: Prisma.MarketingCampaignUncheckedUpdateInput;
    try {
      data = campaignData((req.body ?? {}) as Record<string, unknown>, true);
      campaign = await prisma.marketingCampaign.update({ where: { id: existing.id }, data });
    } catch (err) {
      return handleInput(res, err);
    }
    const relinked = await rematchAttributions(campaign.id);
    await logAudit({
      admin: currentAdmin(req),
      action: 'campaign.updated',
      entity: 'campaign',
      entityId: campaign.id,
      details: `${campaign.name}: ${Object.keys(data).join(', ')} changed; ${relinked} order touch(es) re-linked`,
    });
    res.json({ campaign: (await withOrderCounts([campaign]))[0], relinked });
  })
);

/** Delete only campaigns nothing points at — otherwise archive (keeps history intact). */
router.delete(
  '/admin/advertising/campaigns/:id',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_MANAGE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const linked = await prisma.orderAttribution.count({ where: { campaignId: existing.id } });
    if (linked > 0) return res.status(409).json({ error: `${linked} order touch(es) are linked to this campaign — archive it instead` });
    await prisma.marketingCampaign.delete({ where: { id: existing.id } });
    await logAudit({ admin: currentAdmin(req), action: 'campaign.deleted', entity: 'campaign', entityId: existing.id, details: existing.name });
    res.json({ ok: true });
  })
);

router.post(
  '/admin/advertising/campaigns/rematch',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_MANAGE),
  asyncHandler(async (req, res) => {
    const relinked = await rematchAttributions();
    await logAudit({ admin: currentAdmin(req), action: 'campaign.rematch', entity: 'campaign', details: `${relinked} order touch(es) linked` });
    res.json({ relinked });
  })
);

/** UTM campaigns seen on orders that no campaign matches yet (fix naming here). */
router.get(
  '/admin/advertising/attribution/unmatched',
  requirePermission(PERM.ADVERTISING_CAMPAIGNS_VIEW),
  asyncHandler(async (_req, res) => {
    const groups = await prisma.orderAttribution.groupBy({
      by: ['utmSource', 'utmMedium', 'utmCampaign', 'utmId', 'channel'],
      where: { touch: 'last', campaignId: null, OR: [{ utmCampaign: { not: null } }, { utmId: { not: null } }] },
      _count: { _all: true },
      _max: { touchedAt: true },
    });
    res.json({
      unmatched: groups
        .map((g) => ({
          utmSource: g.utmSource,
          utmMedium: g.utmMedium,
          utmCampaign: g.utmCampaign,
          utmId: g.utmId,
          channel: g.channel,
          orders: g._count._all,
          lastSeenAt: g._max.touchedAt,
        }))
        .sort((a, b) => b.orders - a.orders),
    });
  })
);

export default router;
