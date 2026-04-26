# MuziMind 🎵

> Your personal music intelligence platform — powered by Last.fm scrobbles, AI-generated daily readings, and smart listening analytics.

**Live:** [muzimind.com](https://muzimind.com)

---

## Features

- **Daily Musical Reading** — AI-generated 4-part reflection on your recent listening habits (Groq / Llama 3.3 70B)
- **Listening Statistics** — Top artists, tracks, genres, scrobble history synced from Last.fm
- **Smart Recommendations** — Personalized artist and track suggestions based on your taste profile
- **User Profiles** — Bio, pronouns, nationality, scrobble count, join date
- **Authentication** — Register, email verification (Resend), password reset, change password
- **Admin Panel** — User management for administrators
- **Dark / Light theme** — Persisted across sessions, no flash on load
- **Mobile-friendly** — Touch cursor glow, Safari ITP workaround, responsive layout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas |
| AI | Groq API (Llama 3.3 70B) |
| Music Data | Last.fm API |
| Email | Resend |
| Sessions | express-session + connect-mongo |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free tier works)
- A [Last.fm API key](https://www.last.fm/api/account/create)
- A [Resend](https://resend.com) account and API key
- A [Groq](https://console.groq.com) API key

### 1. Clone & install

```bash
git clone https://github.com/leo1011001/MuziMind.git
cd MuziMind

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Environment variables

Create `server/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/muzimind
SESSION_SECRET=any-long-random-string

LASTFM_API_KEY=your_lastfm_api_key

GROQ_API_KEY=your_groq_api_key

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=MuziMind <onboarding@resend.dev>   # use resend.dev for local testing

CLIENT_URL=http://localhost:5173
```

Create `.env` (frontend root):

```env
VITE_API_URL=http://localhost:3000
```

### 3. Start

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd server
npm run server

# Terminal 2 — Frontend
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)  
Backend: [http://localhost:3000](http://localhost:3000)

---

## Hosted Deployment

The live app runs on two separate platforms:

### Frontend → Vercel

The React/Vite frontend is deployed to **Vercel** at [muzimind.com](https://muzimind.com).

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Root directory:** `/` (repo root)
- **Environment variable to set in Vercel:**

```
VITE_API_URL=https://muzimind-production.up.railway.app
```

SPA routing is handled via `vercel.json` (already in repo), which rewrites all paths to `index.html`.

### Backend → Railway

The Express server is deployed to **Railway** with root directory set to `server/`.

- **Start command:** `npm run server`
- **Node version:** 22 (set via `server/.node-version`)
- **Environment variables to set in Railway:**

```
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=...
LASTFM_API_KEY=...
GROQ_API_KEY=...
RESEND_API_KEY=re_...
EMAIL_FROM=MuziMind <noreply@muzimind.com>
CLIENT_URL=https://muzimind.com
NODE_ENV=production
```

> **Note:** `EMAIL_FROM` using `noreply@muzimind.com` requires `muzimind.com` to be verified in your Resend dashboard (Domains → Add Domain → add the 3 DNS records).

### Deploy flow

```bash
# Any push to main triggers:
# • Vercel auto-redeploys the frontend
# • Railway auto-redeploys the backend
git push origin main
```

---

## Project Structure

```
MuziMind/
├── src/                    # React frontend
│   ├── pages/              # Route-level components
│   │   ├── Home/
│   │   ├── Stats/ & StatsExpanded/
│   │   ├── Recommendations/ & RecommendationsExpanded/
│   │   ├── Profile/
│   │   ├── Login/
│   │   ├── Admin/
│   │   └── ...
│   ├── components/         # Shared UI components
│   ├── contexts/           # AuthContext, ThemeContext
│   └── styles/
├── server/                 # Express backend
│   ├── index.ts            # Main server + all API routes
│   ├── email.ts            # Resend email service
│   ├── loadEnv.ts          # .env loader + DNS config
│   ├── api/                # Database, auth, sync helpers
│   └── models/             # MongoDB collection types
├── public/                 # Static assets (favicon, etc.)
├── vercel.json             # SPA rewrite rules
└── package.json            # Frontend dependencies
```

---

## Environment Variable Reference

| Variable | Where | Description |
|---|---|---|
| `VITE_API_URL` | Frontend (Vercel) | Full URL of the backend, e.g. `https://...railway.app` |
| `MONGODB_URI` | Backend (Railway) | MongoDB Atlas connection string |
| `SESSION_SECRET` | Backend | Secret for signing session cookies |
| `LASTFM_API_KEY` | Backend | Last.fm API key for scrobble sync |
| `GROQ_API_KEY` | Backend | Groq API key for AI readings |
| `RESEND_API_KEY` | Backend | Resend API key for transactional email |
| `EMAIL_FROM` | Backend | Sender address, e.g. `MuziMind <noreply@muzimind.com>` |
| `CLIENT_URL` | Backend | Frontend origin for CORS + email links |
| `NODE_ENV` | Backend | Set to `production` on Railway |

---

## License

Private project — all rights reserved.
