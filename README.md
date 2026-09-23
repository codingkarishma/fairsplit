# FairSplit

**Group dinners, without the maths.**

FairSplit is a full-stack web app that turns a restaurant receipt into a shared, live bill. The host creates a bill, the group joins with a single code, everyone claims what they had, and the final breakdown — with tax, tip, and UPI payment links — is computed and persisted automatically.

![FairSplit](https://img.shields.io/badge/stack-Node%20%2B%20React%20%2B%20MongoDB-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Design Decisions](#design-decisions)
- [Limitations](#limitations)
- [Contributing](#contributing)

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
| **Backend** | Node.js, Express, Mongoose (MongoDB) |
| **Frontend** | React 19, React Router v7, Vite |
| **Styling** | Tailwind CSS 3, custom design tokens |
| **State** | React hooks (`useState`, `useEffect`, `useCallback`), `useLocalStorage` |
| **UI Components** | Custom-built (Button, Card, Input, Badge, ErrorMessage, LoadingSpinner, ClaimItems, Navbar, Footer, Toaster) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **OCR** | Tesseract.js (server-side) |
| **Notifications** | Sonner (toast notifications) |
| **Rate Limiting** | express-rate-limit |
| **CORS** | cors with allowlist via env var |

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
- Claim/unclaim operations are **atomic** using MongoDB `findOneAndUpdate` with `$push`/$pull` and query guards — never read-then-write
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
│   ├── dist/                      # Production build (gitignored)
│   └── package.json
├── docs/
│   ├── PROJECT_RULES.md            # Locked project decisions (24 rules)
│   ├── SCHEMA.md                   # Canonical schema reference
│   └── VERIFICATION_PROMPT.md      # Reusable verification prompt for AI sessions
├── test/
│   └── shopping_receipt.pdf        # Test fixture
├── test-receipt.txt                # Sample receipt for OCR testing
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
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Variables

Create `.env` files in both project roots:

**Backend — `.env`**
```env
MONGODB_URI=mongodb://localhost:27017/fairsplit
FRONTEND_URL=http://localhost:5173
PORT=5000
```

**Frontend — `.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

> Both `.env` files are listed in `.gitignore` and will not be committed.

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
