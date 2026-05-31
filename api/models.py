from pydantic import BaseModel
from typing import Optional

class Problem(BaseModel):
    number: Optional[str] = ""
    name: str
    difficulty: str
    topic: str
    status: str
    timeComplexity: Optional[str] = ""
    note: Optional[str] = ""
    date: str
    nextReview: Optional[str] = ""
    reviewInterval: Optional[int] = 0