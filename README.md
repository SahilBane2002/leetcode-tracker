# LeetCode Tracker

Track every LeetCode problem you solve, get AI-generated topic/complexity/notes from your code, and revisit problems on a spaced-repetition schedule.

The project has three pieces:

- **Web app** (`src/`) — React + Vite dashboard with stats, filters, and a review queue.
- **API** (`api/`) — FastAPI service backed by MongoDB, with Supabase JWT auth and Anthropic Claude for AI suggestions. See [`api/README.md`](api/README.md) for endpoint details.
- **Chrome extension** (`extension/`) — content script that detects accepted submissions on `leetcode.com`, pulls the title/difficulty/code, and prompts you to log them via the deployed app.

## Features

- Auth via Supabase (email/password or Google OAuth).
- Auto-log accepted LeetCode submissions from the browser extension; detects duplicates and offers update / log-as-new.
- AI suggestions for topic, time complexity, and a short note — from either the problem name alone or the submitted code (uses Claude Haiku).
- Spaced-repetition review queue: intervals start from difficulty (Easy 7d / Medium 3d / Hard 1d), double on success, cap at 60 days, reset to 1 day on failure.
- Filter + search across topic, difficulty, status, name, and problem number.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite 8, `@supabase/supabase-js` |
| Backend | FastAPI, Motor (async MongoDB), python-jose, Mangum |
| Auth | Supabase (JWTs verified server-side via JWKS) |
| Database | MongoDB |
| AI | Anthropic Claude (`claude-haiku-4-5`) |
| Hosting | Vercel (static frontend + `@vercel/python` function) |
| Extension | Chrome MV3 content + background scripts |

## Repo layout

```
.
├── api/                FastAPI backend (see api/README.md)
├── src/                React app
│   ├── App.jsx         UI: auth, tracker, review queue
│   ├── api.js          Frontend API client + Supabase init
│   └── main.jsx
├── extension/          Chrome MV3 extension
│   ├── manifest.json
│   ├── content.js      Injects the post-submit popup
│   ├── bridge.js       page <-> extension messaging
│   ├── tracker_bridge.js  passes the Supabase token to the extension
│   └── background.js
├── public/
├── vercel.json         Routes /api/* to api/index.py
├── vite.config.js
└── package.json
```

## Setup

### Prerequisites

- Node 20+
- Python 3.11+
- A MongoDB cluster (Atlas works)
- A Supabase project (used only for auth)
- An Anthropic API key

### 1. Environment

Copy `.env.example` to `.env.local` and fill in:

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=leetcode_tracker
SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
ANTHROPIC_API_KEY=sk-ant-...
```

Note: the frontend reads the `VITE_*` vars at build time; the API reads `SUPABASE_URL` (no `VITE_` prefix) to fetch JWKS and verify tokens.

### 2. Frontend

```bash
npm install
npm run dev          # http://localhost:5173
```

### 3. API

```bash
cd api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn index:app --reload --port 8000
```

In dev, Vite proxies `/api/*` to the FastAPI server (see `vite.config.js`).

### 4. Chrome extension

1. Open `chrome://extensions`, enable Developer mode.
2. **Load unpacked** → select the `extension/` folder.
3. Edit `extension/manifest.json` and replace `https://your-tracker.vercel.app/*` with your deployed origin (in both `host_permissions` and the matching content-script rule).
4. Sign in once on the web app — `tracker_bridge.js` hands the Supabase access token to the extension so it can call the API.
5. Solve a problem on LeetCode; on **Accepted**, a popup walks you through logging it.

## Deploy

`vercel.json` builds both halves of the app:

- `api/index.py` → `@vercel/python` serverless function, mounted at `/api/*`.
- The Vite build → static output in `dist/`.

Set the env vars from step 1 in the Vercel project settings, then `vercel deploy`. Update the extension's `host_permissions` to your production origin and reload it.

## License

MIT — see [`api/LICENSE`](api/LICENSE).
