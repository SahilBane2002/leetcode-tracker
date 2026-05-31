// Runs on the tracker page (isolated world)
// Reads token from localStorage and sends to background script via chrome.runtime

function syncToken() {
  const token = localStorage.getItem("lct_token")
  if (!token) return
  chrome.runtime.sendMessage({ type: "STORE_TOKEN", token }, (res) => {
    if (chrome.runtime.lastError) return // extension not installed, ignore
    if (res?.ok) console.log("[LCT] Token synced to extension")
  })
}

// Sync on page load
syncToken()

// Sync when token is updated (e.g. after login or token refresh)
window.addEventListener("storage", (e) => {
  if (e.key === "lct_token" && e.newValue) syncToken()
})

// Re-sync every 30 minutes to handle token refresh
setInterval(syncToken, 30 * 60 * 1000)