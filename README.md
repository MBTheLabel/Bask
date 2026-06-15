# BASK — High-Touch Travel & Concierge

Full-stack web application for BASK — a curated LGBTQ+ travel and concierge platform.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Leaflet maps
- **Backend**: Express.js + TypeScript
- **Database**: MySQL (via mysql2)
- **Auth**: JWT (bcrypt password hashing)
- **Payments**: Stripe (subscriptions + one-time payments)
- **Maps**: Leaflet / OpenStreetMap
- **PDFs**: PDFKit

## Quick Start (Local Development)

```bash
# 1. Clone and install
npm install
cd client && npm install && cd ..

# 2. Set up environment
cp .env.example .env
# Fill in your MySQL and Stripe credentials

# 3. Set up database
mysql -u root -p -e "CREATE DATABASE bask_db;"
mysql -u root -p bask_db < server/db/schema.sql

# 4. Run development servers (both frontend + backend)
npm run dev
```

App runs at:
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Admin Access

- URL: http://localhost:5173/admin
- Email: mykebmusic@gmail.com
- Default password: Admin@BASK2026! (change immediately)

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full HostGator VPS setup guide.

## Project Structure

```
bask/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # All 14+ page components
│   │   ├── components/     # Reusable UI components + layout
│   │   └── lib/            # API client, auth store
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── middleware/         # JWT auth middleware
│   └── db/                 # MySQL connection + schema
├── shared/                 # TypeScript types shared by both
└── DEPLOYMENT.md           # Full VPS deployment guide
```

## Features

- ✅ JWT authentication (register, login, profile)
- ✅ Membership tiers (Standard + Elite)
- ✅ Stripe subscriptions (Elite upgrade)
- ✅ Stripe one-time payments (Shop + Itineraries)
- ✅ Stripe webhook handling (auto Elite upgrade)
- ✅ Curated trips + Request to Join
- ✅ Custom trip request wizard (5-step form)
- ✅ Concierge request system
- ✅ Partner Homes + Stay Requests
- ✅ Partner Perks (Elite only)
- ✅ Gift Shop (merch + pearls)
- ✅ Beach Map (24 locations, Leaflet, Elite only)
- ✅ Admin Dashboard (all tabs + PDF export)
- ✅ Membership gate
- ✅ Profile management
- ✅ Blog & Listen (Spotify embed)
- ✅ Rate limiting + security headers
- ✅ File uploads (profile photos)
