# FairSplit

**Group dinners, without the maths.**

FairSplit is a full-stack web app that turns a restaurant receipt into a shared, live bill. The host creates a bill, the group joins with a single code, everyone claims what they had, and the final breakdown — with tax, tip, and UPI payment links — is computed and persisted automatically.

![Stack](https://img.shields.io/badge/stack-Node%20%2B%20React%20%2B%20MongoDB-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)

**Live Demo:** _coming soon_

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 🍽️ Bill Creation (Host Flow)
- **Create a bill** with a title, currency (INR, GBP, USD), tax %, tip %, and optional UPI ID
- **Upload a receipt** (JPG, JPEG, PNG, BMP, WebP, TXT — up to 5 MB) and have line items extracted automatically via Tesseract OCR
- **Skip OCR** and add items manually if preferred
- **Review and edit** extracted items before publishing — rename, adjust price, change quantity
- **Publish** the bill, which auto-creates the host as a participant and generates a unique 6-digit share code and a 12-digit host code

### 🔗 Join & Claim (Participant Flow)
- **Join a bill** with a 6-digit share code — no account required
- **Claim items** by tapping them; each item can be claimed by any participant (no quantity cap)
- **Custom claims** — split an item by exact amount or percentage instead of even split
- **Unclaim** any item at any time
- **Live updates** via 5-second polling; participant list and totals refresh automatically

### 📊 Dashboard & Final Breakdown
- **Host dashboard** with publish/close controls, participant list, and item overview
- **Close the bill** to lock all claims and compute final totals
- **Final breakdown** shows per-person: claimed items, unclaimed share, tax share, tip share, and final total — all in integer cents (no floating-point errors)
- **UPI payment links** auto-generated for INR bills when a host UPI ID is set
- **Copy amounts** to clipboard for non-INR currencies

### 📸 OCR Receipt Processing
- **Tesseract.js** runs server-side for image-based receipts
- **Plain-text fallback** for `.txt` receipt files (useful for testing)
- **Smart filtering** — removes decorative lines, totals, tax, tip, contact info, and other non-item lines from OCR output
- **Host review** is the correctness guarantee; the OCR is a best-effort heuristic, not a parser

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js 20+, Express, Mongoose (MongoDB) |
| **Frontend** | React 19, React Router v7, Vite |
| **Styling** | Tailwind CSS 3, custom design tokens |
| **State** | React hooks (`useState`, `useEffect`, `useCallback`), `useLocalStorage` |
| **UI Components** | Custom-built (Button, Card, Input, Badge, ErrorMessage, LoadingSpinner, ClaimItems, Navbar, Footer, Toaster) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **OCR** | Tesseract.js (server-side) |
| **Notifications** | Sonner (toast notifications) |
| **Rate Limiting** | express-rate-limit |
| **Security** | Helmet, CORS allowlist via env var |
| **Env Management** | dotenvx |

---

## Architecture

### Two-Code Access Control
FairSplit uses a **two-code system** for access control:
- **`shareCode`** (6 characters) — public, given to all participants. Required for joining and claiming items.
- **`hostCode`** (12 characters) — secret, known only to the bill creator. Required as `X-Host-Code` header for host-only actions (edit items, publish, close). Never accepted as a query parameter.

### Bill Lifecycle

```
draft → open → closed
  ↑        ↑        ↑
create  publish   close
        (host)    (host)
```

- **draft** — Bill created, items can be added/edited by host
- **open** — Published; participants can join and claim items
- **closed** — Finalized; all claims locked, totals computed and persisted

### Money Math
- All amounts stored and calculated in **integer cents** — never floating-point decimals
- Splitting N cents among K people: `base = Math.floor(N/K)`, `remainder = N % K`, remainder cents distributed one each to the first `remainder` participants sorted by `_id` (deterministic order)
- Final totals are **computed server-side** at close time and **persisted** on the Bill document as `finalBreakdown` — never recomputed client-side

### Concurrency
- Claim/unclaim operations are **atomic** using MongoDB `findOneAndUpdate` with `$push`/`$pull` and query guards — never read-then-write
- When closing, the status flips to `closed` atomically **before** fetching items for totals calculation, closing the race window
- **No Socket.io, no real-time push** — V1 uses plain REST + polling (JoinPage refetches every 5 seconds). This is a deliberate, locked decision.
- **No Redis** — MongoDB's atomic conditional updates already solve every concurrency problem for a single-database deployment.

---

## Project Structure

```
fairsplit/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server, CORS, rate limiting
│   │   ├── routes/
│   │   │   ├── bills.js          # Bill CRUD, publish, close, items, claims
│   │   │   └── ocr.js            # Receipt upload and OCR extraction
│   │   ├── services/
│   │   │   ├── ocr.service.js    # Tesseract.js OCR + receipt line parsing
│   │   │   └── totals.service.js # Integer-cents split calculation
│   │   └── models/
│   │       ├── Bill.js           # Bill schema (status, shareCode, hostCode)
│   │       ├── Item.js           # Item schema (claims array, priceCents)
│   │       └── Participant.js    # Participant schema (name, isHost)
│   ├── uploads/                   # Temp receipt storage (gitignored)
│   ├── .env                       # Local secrets (gitignored)
│   ├── .env.example               # Template for local setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js         # Fetch-based API client
│   │   ├── components/
│   │   │   ├── common/           # Button, Card, Input, Badge, ErrorMessage, LoadingSpinner
│   │   │   ├── shared/           # ClaimItems, Navbar, Footer
│   │   │   ├── ui/               # Sonner Toaster
│   │   │   └── home/             # FeatureCard, StepCard
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Landing page with features & steps
│   │   │   ├── HostPage.jsx      # Create bill → upload → review → publish
│   │   │   ├── JoinPage.jsx      # Enter code → join → claim items
│   │   │   ├── BillDashboard.jsx # Host dashboard (publish/close, participants, items)
│   │   │   └── TotalsPage.jsx    # Final breakdown with UPI links
│   │   ├── hooks/
│   │   │   ├── useBill.js        # Fetch/refetch bill data
│   │   │   ├── useLocalStorage.js # Per-bill localStorage persistence
│   │   │   └── useToast.js       # Sonner toast notifications
│   │   ├── utils/
│   │   │   ├── currency.js       # Formatting, INR/GBP/USD symbols
│   │   │   ├── split.js          # Person breakdown calculation
│   │   │   └── validation.js     # Bill form & participant validation
│   │   ├── App.jsx               # Routes & layout
│   │   └── main.jsx              # Entry point
│   ├── public/
│   │   └── favicon.svg
│   ├── .env                       # Local secrets (gitignored)
│   ├── .env.example               # Template for local setup
│   ├── dist/                      # Production build (gitignored)
│   └── package.json
├── docs/
│   ├── PROJECT_RULES.md            # Locked project decisions (24 rules)
│   ├── SCHEMA.md                   # Canonical schema reference
│   └── VERIFICATION_PROMPT.md      # Reusable verification prompt for AI sessions
├── test/
│   └── shopping_receipt.pdf        # Test fixture
├── test-receipt.txt                # Sample receipt for OCR testing
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js** 20.11+ (required for `import.meta.dirname` in Vite config)
- **MongoDB** instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** or **yarn**

### 1. Clone & Install

```bash
git clone https://github.com/codingkarishma/fairsplit.git
cd fairsplit

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

See [Environment Variables](#environment-variables) below for what to put in each.

### 3. Run Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Server running on http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# App running on http://localhost:5173
```

### 4. Build for Production

```bash
cd frontend
npm run build
# Output in /frontend/dist
```

---

## Environment Variables

Both `.env` files are gitignored and never committed. Use the `.env.example` files as templates.

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express server listens on | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/fairsplit` |
| `FRONTEND_URL` | Frontend origin(s) for CORS (comma-separated) | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

**Local (`backend/.env`)**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://fairsplit-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fairsplit?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Production (Render dashboard)**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://fairsplit-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fairsplit?retryWrites=true&w=majority
FRONTEND_URL=https://your-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

> Do **not** set `PORT` on Render — it is injected automatically.

### Frontend — `frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:5000/api` |

**Local (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
```

**Production (Vercel dashboard)**
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

> ⚠️ **Vite rule:** Only variables prefixed with `VITE_` are exposed to the browser. Never put secrets here.

### `.env.example` templates (commit these)

**`backend/.env.example`**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://fairsplit-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fairsplit?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**`frontend/.env.example`**
```env
VITE_API_URL=http://localhost:5000/api
```

### `.gitignore` (both folders must contain)

```
.env
.env.local
.env.*.local
node_modules
dist
```

---

## API Reference

All endpoints are prefixed with `/api`. Host-only endpoints require the `X-Host-Code` header.

### Bills

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bills` | — | Create a new bill (rate-limited) |
| `GET` | `/bills/:shareCode` | — | Get bill by share code |
| `PATCH` | `/bills/:shareCode/publish` | Host | Publish a draft bill |
| `PATCH` | `/bills/:shareCode/close` | Host | Close and compute final totals |

### Items

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bills/:shareCode/items` | Host | Add an item (draft-only) |
| `PUT` | `/bills/:shareCode/items` | Host | Bulk-replace items (draft-only) |
| `PATCH` | `/bills/:shareCode/items/:itemId` | Host | Update an item |
| `DELETE` | `/bills/:shareCode/items/:itemId` | Host | Delete an item |

### Participants & Claims

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bills/:shareCode/participants` | — | Join a bill |
| `POST` | `/bills/:shareCode/items/:itemId/claim` | — | Claim an item (supports custom amount/percentage) |
| `DELETE` | `/bills/:shareCode/items/:itemId/claim` | — | Unclaim an item |

### OCR

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/ocr/extract` | — | Upload a receipt and extract items (rate-limited) |

---

## Database Schema

Full schema details are in [`docs/SCHEMA.md`](./docs/SCHEMA.md). Summary:

### `Bill`

| Field | Type | Notes |
|---|---|---|
| `title` | String | Bill name |
| `currency` | String | `INR`, `GBP`, or `USD` |
| `taxPercent` | Number | e.g., `5` for 5% |
| `tipPercent` | Number | e.g., `10` for 10% |
| `upiId` | String | Optional, for INR payment links |
| `status` | String | `draft`, `open`, or `closed` |
| `shareCode` | String | 6-char public code |
| `hostCode` | String | 12-char secret code |
| `finalBreakdown` | Object | Persisted at close time |

### `Item`

| Field | Type | Notes |
|---|---|---|
| `billId` | ObjectId | Reference to Bill |
| `name` | String | Item name |
| `priceCents` | Number | Price in integer cents |
| `quantity` | Number | Default `1` |
| `claims` | Array | List of `{ participantId, amountCents }` |

### `Participant`

| Field | Type | Notes |
|---|---|---|
| `billId` | ObjectId | Reference to Bill |
| `name` | String | Display name |
| `isHost` | Boolean | True for the bill creator |

---

## Deployment

FairSplit is deployed as three independent services: **MongoDB Atlas** (database), **Render** (backend), and **Vercel** (frontend).

### 1. MongoDB Atlas

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a new project → **Build a Database**.
   - **M0 (Free)** is fine for testing; **M10+** recommended for production.
   - Choose a region closest to your backend host.
3. **Database Access** → add a user (e.g., `fairsplit-app`) with a strong password.
4. **Network Access** → add your backend host's static IPs, or `0.0.0.0/0` temporarily.
5. **Connect → Drivers → Node.js** → copy the connection string.
6. Add your database name (`fairsplit`) before the `?`:
   ```
   mongodb+srv://fairsplit-app:PASSWORD@cluster0.xxxxx.mongodb.net/fairsplit?retryWrites=true&w=majority
   ```
7. If your password contains special characters (`@`, `#`, `%`, etc.), URL-encode them: `@` → `%40`, `#` → `%23`, `%` → `%25`.

### 2. Backend — Render

1. Push your repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service** → connect your repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
4. Add **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas connection string |
   | `FRONTEND_URL` | your Vercel URL (add after frontend deploy) |
   | `RATE_LIMIT_WINDOW_MS` | `900000` |
   | `RATE_LIMIT_MAX_REQUESTS` | `100` |

5. Deploy. Note the backend URL (e.g., `https://fairsplit-backend.onrender.com`).
6. Test: open `https://fairsplit-backend.onrender.com/` — you should see `{"message":"FairSplit API is running"}`.

### 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your repo.
2. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add **Environment Variable**:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://fairsplit-backend.onrender.com/api` |

4. Deploy. Note the frontend URL (e.g., `https://fairsplit.vercel.app`).

### 4. Wire Up CORS

Return to Render → your backend service → **Environment**, and update:

```env
FRONTEND_URL=https://fairsplit.vercel.app
```

Save — Render auto-redeploys. Your app is live.

### Production Checklist

- [ ] Atlas cluster created and network access configured
- [ ] Backend deployed to Render with all env vars set
- [ ] Frontend deployed to Vercel with `VITE_API_URL` set
- [ ] `FRONTEND_URL` on Render updated to the live Vercel URL
- [ ] Backend redeployed after updating `FRONTEND_URL`
- [ ] `.env` files never committed to git
- [ ] End-to-end smoke test: create bill → join → claim → close → totals

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `EADDRINUSE: address already in use` | Another process on the port | `taskkill //IM node.exe //F` (Windows) or `lsof -ti:5000 \| xargs kill` (macOS/Linux) |
| `MongoServerError: bad auth` | Wrong Atlas password | Check `MONGODB_URI`, URL-encode special chars |
| CORS error in browser | `FRONTEND_URL` doesn't match the frontend origin | Update `FRONTEND_URL` in `backend/.env` (or Render) and restart |
| `Cannot find module 'helmet'` | Deps not installed | `npm install helmet` in `backend/` |
| `Cannot find module 'dotenv'` | Deps not installed | `npm install dotenv` in `backend/` |
| Frontend can't reach API | Wrong `VITE_API_URL` | Must include `/api` at the end and match the backend URL |

---

## Design Decisions

- **Integer cents everywhere** — avoids floating-point drift when splitting amounts.
- **Two-code access control** — `shareCode` for participants, `hostCode` for host-only actions.
- **Server-side totals at close** — persisted on the Bill, never recomputed client-side.
- **Atomic claim operations** — `findOneAndUpdate` with query guards; no read-then-write races.
- **Polling over WebSockets** — simpler, more portable, and adequate for the V1 scale.
- **No Redis** — MongoDB's atomic updates handle all V1 concurrency needs.
- **OCR as a heuristic, not a parser** — host review is the correctness guarantee.

Full rationale is in [`docs/PROJECT_RULES.md`](./docs/PROJECT_RULES.md) (24 locked rules).

---

## Limitations

- **No accounts or auth** — access is by code only. Anyone with a `shareCode` can join.
- **No real-time push** — updates propagate via 5-second polling.
- **OCR is best-effort** — the host must review extracted items before publishing.
- **UPI links are INR-only** — other currencies fall back to copy-to-clipboard.
- **No multi-currency bills** — one currency per bill.

---

## Contributing

This project follows a strict set of locked rules documented in [`docs/PROJECT_RULES.md`](./docs/PROJECT_RULES.md). Before opening a PR:

1. Read the project rules.
2. Run `npm run lint` and `npm run build` in both `backend/` and `frontend/`.
3. Keep changes focused — one feature or fix per PR.
4. Update relevant docs (`README.md`, `docs/SCHEMA.md`) alongside code changes.

---

## License

ISC © [Karishma](https://github.com/codingkarishma)