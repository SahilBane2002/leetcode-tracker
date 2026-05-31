from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB  = os.environ.get("MONGODB_DB", "leetcode_tracker")

print("MONGODB_URI loaded:", bool(MONGODB_URI))

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]
problems_collection = db["problems"]