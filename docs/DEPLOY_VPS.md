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

---

### Notes
- `vercel.json` is unused on a VPS — harmless to keep.
- Dev convenience scripts (`npm run dev`, ports 3000/5173) are untouched;
  production traffic goes through Nginx → port 4000 only.
- If you later add payment gateway webhooks, they hit `/api/orders` style
  public routes through the same Nginx block.
