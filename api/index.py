from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from pydantic import BaseModel
from pathlib import Path
from database import problems_collection
from models import Problem
from suggest import get_suggestion
from jose import jwt, jwk, JWTError
import httpx
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
print("SUPABASE_URL loaded:", bool(SUPABASE_URL))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_jwks_cache = None

async def get_jwks():
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
        print("JWKS response:", res.status_code, res.text[:200])
        _jwks_cache = res.json()
    return _jwks_cache

async def get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ")[1]
    try:
        header = jwt.get_unverified_header(token)
        print("TOKEN ALG:", header.get("alg"), "KID:", header.get("kid"))

        jwks = await get_jwks()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == header.get("kid"):
                key = k
                break
        if not key and jwks.get("keys"):
            key = jwks["keys"][0]
        if not key:
            raise HTTPException(status_code=401, detail="No matching key")

        print("USING KEY:", key.get("kid"), key.get("alg"))
        public_key = jwk.construct(key)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[header.get("alg", "ES256")],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        print("USER ID:", user_id)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError as e:
        print("JWT ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

class ReviewRequest(BaseModel):
    got_it: bool

@app.get("/api/problems/review")
async def get_review_queue(user_id: str = Depends(get_user_id)):
    from datetime import date
    today = str(date.today())
    docs = await problems_collection.find({
        "user_id": user_id,
        "nextReview": {"$lte": today, "$ne": ""}
    }).sort("nextReview", 1).to_list(100)
    return [serialize(d) for d in docs]

@app.post("/api/problems/{id}/review")
async def review_problem(id: str, req: ReviewRequest, user_id: str = Depends(get_user_id)):
    from datetime import date, timedelta
    doc = await problems_collection.find_one({"_id": ObjectId(id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    current_interval = doc.get("reviewInterval", 1) or 1
    if req.got_it:
        new_interval = min(current_interval * 2, 60)  # max 60 days
    else:
        new_interval = 1  # reset

    next_review = str(date.today() + timedelta(days=new_interval))
    await problems_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"nextReview": next_review, "reviewInterval": new_interval}}
    )
    updated = await problems_collection.find_one({"_id": ObjectId(id)})
    return serialize(updated)

@app.get("/api/problems/check")
async def check_problem(name: str, user_id: str = Depends(get_user_id)):
    existing = await problems_collection.find_one({
        "user_id": user_id,
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })
    if existing:
        serialized = serialize(existing)
        print("CHECK FOUND:", serialized.get("id"), serialized.get("name"))
        return {"exists": True, "problem": serialized}
    return {"exists": False}

@app.get("/api/problems")
async def get_problems(user_id: str = Depends(get_user_id)):
    docs = await problems_collection.find(
        {"user_id": user_id}
    ).sort("date", -1).to_list(1000)
    return [serialize(d) for d in docs]

@app.post("/api/problems")
async def add_problem(p: Problem, user_id: str = Depends(get_user_id)):
    from datetime import date, timedelta
    data = p.dict()
    data["user_id"] = user_id
    # Auto-assign number if not provided
    if not data.get("number"):
        last = await problems_collection.find_one(
            {"user_id": user_id},
            sort=[("number", -1)]
        )
        last_num = 0
        if last and last.get("number"):
            try:
                last_num = int(last["number"])
            except ValueError:
                last_num = 0
        data["number"] = str(last_num + 1)
    # Auto-set nextReview based on difficulty
    if not data.get("nextReview"):
        intervals = {"Easy": 7, "Medium": 3, "Hard": 1}
        interval = intervals.get(data.get("difficulty", "Medium"), 3)
        if data.get("status") == "Revisit":
            interval = 1
        data["nextReview"] = str(date.today() + timedelta(days=interval))
        data["reviewInterval"] = interval
    result = await problems_collection.insert_one(data)
    created = await problems_collection.find_one({"_id": result.inserted_id})
    return serialize(created)

@app.put("/api/problems/{id}")
async def update_problem(id: str, p: Problem, user_id: str = Depends(get_user_id)):
    await problems_collection.update_one(
        {"_id": ObjectId(id), "user_id": user_id},
        {"$set": p.dict()}
    )
    updated = await problems_collection.find_one({"_id": ObjectId(id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(updated)

class SuggestRequest(BaseModel):
    problem_name: str
    code: str
    lang: str

@app.post("/api/suggest")
async def suggest(req: SuggestRequest, user_id: str = Depends(get_user_id)):
    result = await get_suggestion(req.problem_name, req.code, req.lang)
    return result

@app.delete("/api/problems/{id}")
async def delete_problem(id: str, user_id: str = Depends(get_user_id)):
    result = await problems_collection.delete_one(
        {"_id": ObjectId(id), "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": id}