const TRACKER_URL = "http://localhost:5173"

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("supabase_token", (res) => {
      resolve(res.supabase_token ?? "")
    })
  })
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  if (!token) return { ok: false, error: "Not logged in. Open your tracker and log in first." }
  try {
    const r = await fetch(`${TRACKER_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {})
      }
    })
    if (r.status === 401) {
      chrome.storage.local.remove("supabase_token")
      chrome.tabs.create({ url: TRACKER_URL })
      return { ok: false, error: "Session expired. Please log in again." }
    }
    if (!r.ok) return { ok: false, error: await r.text() }
    const data = await r.json()
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === "STORE_TOKEN") {
    chrome.storage.local.set({ supabase_token: msg.token }, () => {
      console.log("[LCT] Token stored")
      sendResponse({ ok: true })
    })
    return true
  }

  if (msg.type === "CHECK_PROBLEM") {
    apiFetch(`/api/problems/check?name=${encodeURIComponent(msg.name)}`, {
      method: "GET",
      headers: {}
    }).then(res => {
      sendResponse(res.ok ? res.data : { exists: false })
    })
    return true
  }

  if (msg.type === "SAVE_PROBLEM") {
    apiFetch("/api/problems", {
      method: "POST",
      body: JSON.stringify(msg.payload)
    }).then(res => {
      sendResponse(res.ok ? { ok: true } : { ok: false, error: res.error })
    })
    return true
  }

  if (msg.type === "UPDATE_PROBLEM") {
    console.log("[LCT] Updating problem:", msg.id)
    apiFetch(`/api/problems/${msg.id}`, {
      method: "PUT",
      body: JSON.stringify(msg.payload)
    }).then(res => {
      console.log("[LCT] Update result:", res)
      sendResponse(res.ok ? { ok: true } : { ok: false, error: res.error })
    })
    return true
  }

  if (msg.type === "AI_SUGGEST") {
    apiFetch("/api/suggest", {
      method: "POST",
      body: JSON.stringify(msg.payload)
    }).then(res => {
      sendResponse(res.ok ? { ok: true, data: res.data } : { ok: false })
    })
    return true
  }

})