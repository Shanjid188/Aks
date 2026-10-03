# 🚀 VPS Deployment Guide — AKS Mart

Single-server setup: **one Node process** (PM2) serves the storefront SPA, the
admin SPA (`/admin`), **and** the REST API (`/api`) on the same origin.
Nginx sits in front for SSL/caching. SQLite runs from the server's persistent
disk, so orders/products/uploads survive reboots.

```
Internet ──► Nginx :80/:443 (SSL, gzip, cache)
                 └──► Node/Express :4000 (PM2 "aks-store")
                          ├── /api/*      REST API (Prisma + SQLite)
                          ├── /images/*   product & hero images (public/)
                          ├── /admin/*    Admin panel SPA (admin/dist)
                          └── /*          Storefront SPA (dist/)
```

---

## 0. Prerequisites (Ubuntu 22.04/24.04 VPS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm i -g pm2
```

Point your domain's **A record** to the VPS IP before step 6.

---

## 1. Get the code + configure secrets

```bash
cd /var/www && git clone https://github.com/Shanjid188/Aks.git aks-store && cd aks-store

# Server env — SET A STRONG JWT SECRET (never reuse the dev value!)
cd server && cp .env.example .env && nano .env
#   DATABASE_URL="file:./dev.db"
#   PORT=4000
#   JWT_SECRET="<paste 40+ random chars>"
#   JWT_EXPIRES_IN="12h"
cd ..
```

> Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 2. Install & build all three parts

```bash
npm ci && npm run build            # storefront → dist/
cd admin && npm ci && npm run build && cd ..   # admin → admin/dist/
cd server && npm ci --no-audit --no-fund
npm run prisma:generate
npm run prisma:push                # creates SQLite tables
npm run seed                       # products, stores, coupons, slides…
```

## 3. 🔐 Set YOUR real admin password (do not skip!)

```bash
ADMIN_EMAIL="owner@yourdomain.com" ADMIN_PASSWORD="YourStrongPass@123" \
  node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/set-admin-password.ts
```
This replaces the seeded demo account password. Login afterwards at
`https://yourdomain.com/admin`.

## 4. Start with PM2

```bash
mkdir -p server/logs               # PM2 log folder
pm2 start ecosystem.config.cjs     # from repo root
pm2 save && pm2 startup            # survive reboots (run the printed command too)
pm2 logs aks-store                 # should show "🚀 AKS API listening …"
```

## 5. Nginx + free SSL

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/aks-store
sudo nano /etc/nginx/sites-available/aks-store   # set your domain
sudo ln -s /etc/nginx/sites-available/aks-store /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 6. ✅ Verify checklist

| Test | Expect |
|---|---|
| `https://yourdomain.com` | Storefront loads, products visible |
| `https://yourdomain.com/api/health` | `{"status":"ok",…}` |
| `https://yourdomain.com/admin` | Admin login page (**no password hint shown**) |
| Place a test order | Receipt with `AKS-BD-xxxxxx` code |
| Track that code via Order Tracker | Order found |
| Log into `/admin` → Orders | Your test order listed |
| Upload an image (Products page) | Saved under `public/images/uploads/` |

---

## 7. Deploying an update

```bash
cd /var/www/aks-store
git pull
npm ci && npm run build
cd admin && npm ci && npm run build && cd ..
cd server && npm ci --no-audit --no-fund && npm run prisma:generate
node node_modules/prisma/build/index.js db push   # if schema changed
cd .. && pm2 restart aks-store
```

## 8. Backups (SQLite is just a file)

```bash
# crontab -e  → nightly 3am copy of the DB:
0 3 * * * cp /var/www/aks-store/server/prisma/dev.db \
             /root/backups/aks-$(date +\%F).db
```

Or, on-demand before anything risky:

```bash
cd server && npm run db:backup   # → prisma/dev.db.backup-<timestamp>
```

---

## 9. Why production drifts from local (and how to resync)

`server/prisma/dev.db` is **gitignored**. Every environment keeps its own
database, so `git pull` syncs the **code** and never the **data**. Roles,
catalog, orders, settings and uploads can therefore differ even when the code
is identical — which is what makes "it works locally" and "it's broken in
production" happen at the same time.

Two useful diagnostics, both read-only:

```bash
npm run check:images --prefix server   # image references with no file on disk
npm run reset:divisions --prefix server   # preview catalog drift (add --apply to fix)
```

### Making production match local exactly

The storefront/admin DB is the only thing that has to be copied; images under
`public/images/` are already in git and arrive with `git pull`.

```bash
# 1. ON THE SERVER — back up first, then stop the app
cd /home/aksmartbd/htdocs/www.aksmartbd.com/server
npm run db:backup
pm2 stop aks-store

# 2. ON YOUR MACHINE — push the local database to the server
scp server/prisma/dev.db root@151.158.158.117:/home/aksmartbd/htdocs/www.aksmartbd.com/server/prisma/dev.db

# 3. ON THE SERVER — restart and verify
cd /home/aksmartbd/htdocs/www.aksmartbd.com/server
npm run backfill:roles && pm2 restart aks-store && pm2 logs aks-store --lines 30
```

> Copying `dev.db` overwrites production orders, customers and admin accounts
> with the local ones. Only do this when local really is the state you want.

### Do NOT use "reset + seed" to resync

`npm run prisma:push --force-reset && npm run seed` produces a *fresh*
database, not your local one. The four banner tables (`SideBanner`,
`GalleryBanner`, `OfferBanner`, `LoveBanner`) are **not** seeded — they only
exist because they were created through the admin panel — so a reset silently
empties every banner on the homepage.

---

### Notes
- `vercel.json` is unused on a VPS — harmless to keep.
- Dev convenience scripts (`npm run dev`, ports 3000/5173) are untouched;
  production traffic goes through Nginx → port 4000 only.
- If you later add payment gateway webhooks, they hit `/api/orders` style
  public routes through the same Nginx block.
