# BASK — HostGator VPS Deployment Guide
## Complete Step-by-Step Setup

---

## PREREQUISITES

- HostGator VPS or Cloud Hosting plan (Ubuntu 20.04/22.04 LTS)
- SSH access to your server
- Domain name pointed to your server IP
- Stripe account with live keys
- MySQL already installed (HostGator VPS includes it)

---

## STEP 1 — SSH INTO YOUR SERVER

```bash
ssh root@your-server-ip
# or
ssh username@your-server-ip
```

---

## STEP 2 — INSTALL NODE.JS 20+

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # should show v20.x.x
npm --version
```

---

## STEP 3 — INSTALL PM2 (PROCESS MANAGER)

```bash
npm install -g pm2
pm2 startup  # Follow the output instructions to enable auto-start
```

---

## STEP 4 — INSTALL NGINX (REVERSE PROXY)

```bash
apt update
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

---

## STEP 5 — SET UP MYSQL DATABASE

```bash
# Log into MySQL (HostGator may have set a root password)
mysql -u root -p

# Run these SQL commands:
CREATE DATABASE bask_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bask_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON bask_db.* TO 'bask_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import the schema:
mysql -u bask_user -p bask_db < /var/www/bask/server/db/schema.sql
```

---

## STEP 6 — UPLOAD YOUR CODE

### Option A — Git (recommended)

```bash
cd /var/www
git clone https://github.com/yourusername/bask.git
cd bask
```

### Option B — SCP from your local machine

```bash
# From your local machine:
scp -r ./bask root@your-server-ip:/var/www/bask
```

---

## STEP 7 — CONFIGURE ENVIRONMENT VARIABLES

```bash
cd /var/www/bask
cp .env.example .env
nano .env
```

Fill in ALL values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=bask_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=bask_db

JWT_SECRET=generate-a-long-random-string-at-least-64-chars-here
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_live_your_actual_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PUBLIC_KEY=pk_live_your_actual_stripe_public_key
STRIPE_ELITE_PRICE_ID=price_1T2nJRIizMvHewJuz4kwtFfx

PORT=3001
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
UPLOAD_DIR=./uploads
```

**Generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## STEP 8 — INSTALL DEPENDENCIES & BUILD

```bash
cd /var/www/bask

# Install server dependencies
npm install

# Install client dependencies and build
cd client
npm install
npm run build
cd ..
```

---

## STEP 9 — RUN DATABASE MIGRATION

```bash
mysql -u bask_user -p bask_db < server/db/schema.sql
```

This seeds all trips, beaches, products, and the admin user.

**Default admin credentials:**
- Email: `mykebmusic@gmail.com`
- Password: `Admin@BASK2026!`
- **Change this immediately after first login!**

---

## STEP 10 — CREATE UPLOADS DIRECTORY

```bash
mkdir -p /var/www/bask/uploads/profiles
chmod 755 /var/www/bask/uploads
```

---

## STEP 11 — START THE APP WITH PM2

```bash
cd /var/www/bask

# Compile TypeScript server
npx tsc --project tsconfig.json

# Start with PM2
pm2 start dist/server/index.js --name bask-api

# Save PM2 config (auto-restart on server reboot)
pm2 save

# Check status
pm2 status
pm2 logs bask-api
```

---

## STEP 12 — CONFIGURE NGINX

```bash
nano /etc/nginx/sites-available/bask
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Serve React frontend build
    root /var/www/bask/client/dist;
    index index.html;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/bask/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Stripe webhook — no body size limit
    location /api/stripe/webhook {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 5m;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "no-referrer-when-downgrade";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/bask /etc/nginx/sites-enabled/
nginx -t  # Test config
systemctl reload nginx
```

---

## STEP 13 — SSL CERTIFICATE (HTTPS) — FREE WITH LET'S ENCRYPT

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot auto-renews every 90 days.

After SSL, update your `.env`:
```env
CLIENT_URL=https://yourdomain.com
```

Then restart: `pm2 restart bask-api`

---

## STEP 14 — STRIPE WEBHOOK SETUP

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
4. Copy the webhook signing secret → paste into `.env` as `STRIPE_WEBHOOK_SECRET`
5. Restart: `pm2 restart bask-api`

---

## STEP 15 — CHANGE THE ADMIN PASSWORD

After first login at `yourdomain.com`, go to your server and update the hashed password:

```bash
# Generate new hash on server:
node -e "const b = require('bcryptjs'); b.hash('YourNewPassword!', 12).then(h => console.log(h));"

# Update in MySQL:
mysql -u bask_user -p bask_db
UPDATE users SET password_hash='<paste hash here>' WHERE email='mykebmusic@gmail.com';
EXIT;
```

---

## USEFUL COMMANDS

```bash
# View app logs
pm2 logs bask-api

# Restart app
pm2 restart bask-api

# Stop app
pm2 stop bask-api

# Reload after code changes
pm2 reload bask-api

# Monitor CPU/memory
pm2 monit

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MySQL check
mysql -u bask_user -p bask_db -e "SELECT COUNT(*) FROM users;"
```

---

## UPDATING THE APP (AFTER CODE CHANGES)

```bash
cd /var/www/bask

# Pull latest code (if using git)
git pull

# Reinstall if dependencies changed
npm install
cd client && npm install && npm run build && cd ..

# Recompile TypeScript
npx tsc --project tsconfig.json

# Restart
pm2 restart bask-api
```

---

## FIREWALL SETUP

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| App won't start | Check `pm2 logs bask-api` for errors |
| MySQL connection refused | Verify `DB_*` env vars; check `systemctl status mysql` |
| Stripe webhooks failing | Check signing secret; verify endpoint URL in Stripe dashboard |
| 502 Bad Gateway | Node.js app not running; run `pm2 status` |
| Images not loading | Check `uploads/` folder permissions: `chmod -R 755 uploads/` |
| White screen (React) | Check browser console; ensure `client/dist` was built |

---

## ARCHITECTURE SUMMARY

```
Internet → Nginx (port 80/443)
                ↓
    ┌───────────────────────┐
    │   /          React SPA (client/dist)
    │   /api/*     → Node.js Express (port 3001)
    │   /uploads/* → Static file server
    └───────────────────────┘
                ↓
         MySQL Database (bask_db)
         Stripe API (payments)
```

---

*BASK Business Reference — Confidential*
*Generated for HostGator VPS Deployment*
