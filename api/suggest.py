import os
import json
import httpx
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

async def get_suggestion(problem_name: str, code: str, lang: str) -> dict:
    has_code = bool(code and code.strip())

    if has_code:
        prompt = f"""A user just solved the LeetCode problem "{problem_name}" in {lang}.

Here is their solution:
{code[:2000]}

Reply ONLY with a JSON object (no markdown, no code fences) with these exact fields:
- "note": 1-2 sentences explaining the core approach and why it works
- "topic": best matching topic from: Array, String, HashMap, Two Pointers, Sliding Window, Binary Search, Linked List, Tree, Graph, BFS, DFS, Dynamic Programming, Backtracking, Stack, Heap, Greedy, Math, Bit Manipulation, Other
- "timeComplexity": time complexity like "O(n)", "O(n log n)", "O(n^2)"
"""
    else:
        prompt = f"""For the LeetCode problem "{problem_name}", suggest the most common optimal solution approach.

Reply ONLY with a JSON object (no markdown, no code fences) with these exact fields:
- "note": 1-2 sentences explaining the best approach and why it works
- "topic": best matching topic from: Array, String, HashMap, Two Pointers, Sliding Window, Binary Search, Linked List, Tree, Graph, BFS, DFS, Dynamic Programming, Backtracking, Stack, Heap, Greedy, Math, Bit Manipulation, Other
- "timeComplexity": time complexity like "O(n)", "O(n log n)", "O(n^2)"
"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 300,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=15.0
        )

    if res.status_code != 200:
        print("Anthropic error:", res.status_code, res.text)
        return {"note": "", "topic": "Other", "timeComplexity": ""}

    text = res.json()["content"][0]["text"].strip()
    print("RAW AI RESPONSE:", repr(text))
    # Strip markdown fences if model added them anyway
    text = text.replace("```json", "").replace("```", "").strip()
    print("CLEANED TEXT:", repr(text))
    try:
        result = json.loads(text)
        print("PARSED:", result)
        return result
    except Exception as e:
        print("PARSE ERROR:", e)
        return {"note": text, "topic": "Other", "timeComplexity": ""}