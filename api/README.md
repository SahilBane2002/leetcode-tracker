# LeetCode Tracker API

FastAPI backend for the LeetCode Tracker app. Stores solved problems per user in MongoDB, schedules spaced-repetition reviews, and uses Anthropic's Claude to suggest topic/complexity/notes from a submitted solution.

Deployed as a Vercel Python function (`/api/*`) alongside the Vite frontend in the parent project.

## Endpoints

All endpoints require an `Authorization: Bearer <supabase-jwt>` header. The token is verified against Supabase's JWKS endpoint.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/problems` | List the user's problems, newest first. |
| `POST` | `/api/problems` | Add a problem. Auto-assigns `number` and `nextReview` if missing. |
| `PUT` | `/api/problems/{id}` | Update a problem. |
| `DELETE` | `/api/problems/{id}` | Delete a problem. |
| `GET` | `/api/problems/check?name=...` | Case-insensitive lookup by name. |
| `GET` | `/api/problems/review` | Problems whose `nextReview` is on or before today. |
| `POST` | `/api/problems/{id}/review` | Body `{ "got_it": bool }`. Doubles the interval on success (capped at 60 days), resets to 1 day on failure. |
| `POST` | `/api/suggest` | Body `{ problem_name, code, lang }`. Returns `{ note, topic, timeComplexity }` from Claude. |

### Review scheduling

New problems get an initial review interval based on difficulty: Easy = 7 days, Medium = 3, Hard = 1. Status `Revisit` overrides to 1 day. Subsequent reviews double the interval on success, capped at 60 days.

## Project layout

```
api/
├── index.py          FastAPI app, auth, routes
├── database.py       Motor (async MongoDB) client
├── models.py         Pydantic Problem model
├── suggest.py        Anthropic Claude integration
└── requirements.txt
```

## Setup

Requires Python 3.11+, a MongoDB cluster, a Supabase project (for auth), and an Anthropic API key.

```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Environment variables are loaded from `../.env.local` (the parent project root). Copy `../.env.example` and fill in:

```
MONGODB_URI=
MONGODB_DB=leetcode_tracker
SUPABASE_URL=
ANTHROPIC_API_KEY=
```

Run locally:

```bash
uvicorn index:app --reload --port 8000
```

## Deployment

The parent repo's `vercel.json` rewrites `/api/(.*)` to `api/index.py` and builds it with `@vercel/python`. Set the env vars above in the Vercel project settings.

## Data model

```python
class Problem(BaseModel):
    number: Optional[str] = ""
    name: str
    difficulty: str          # Easy | Medium | Hard
    topic: str
    status: str              # Solved | Revisit | ...
    timeComplexity: Optional[str] = ""
    note: Optional[str] = ""
    date: str
    nextReview: Optional[str] = ""
    reviewInterval: Optional[int] = 0
```

Documents are scoped by a `user_id` derived from the verified JWT's `sub` claim.
