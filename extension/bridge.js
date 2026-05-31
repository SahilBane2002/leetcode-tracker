function sendMsg(msg, cb) {
  try {
    chrome.runtime.sendMessage(msg, cb)
  } catch (e) {
    console.warn("[LCT] Extension context lost — reload the page")
    cb?.({ ok: false, error: "Extension reloaded. Please refresh the page." })
  }
}

window.addEventListener("lct-check-problem", (e) => {
  sendMsg({ type: "CHECK_PROBLEM", name: e.detail.name }, (res) => {
    window.dispatchEvent(new CustomEvent("lct-check-result", { detail: res ?? { exists: false } }))
  })
})

window.addEventListener("lct-save-problem", (e) => {
  sendMsg({ type: "SAVE_PROBLEM", payload: e.detail }, (res) => {
    if (res?.ok) {
      window.dispatchEvent(new CustomEvent("lct-save-success"))
    } else {
      window.dispatchEvent(new CustomEvent("lct-save-error", { detail: res?.error ?? "Save failed" }))
    }
  })
})

window.addEventListener("lct-update-problem", (e) => {
  sendMsg({ type: "UPDATE_PROBLEM", id: e.detail.id, payload: e.detail.payload }, (res) => {
    if (res?.ok) {
      window.dispatchEvent(new CustomEvent("lct-save-success"))
    } else {
      window.dispatchEvent(new CustomEvent("lct-save-error", { detail: res?.error ?? "Update failed" }))
    }
  })
})

window.addEventListener("lct-suggest", (e) => {
  sendMsg({
    type: "AI_SUGGEST",
    payload: { problem_name: e.detail.name, code: e.detail.code, lang: e.detail.lang }
  }, (res) => {
    window.dispatchEvent(new CustomEvent("lct-suggestion-result", {
      detail: res?.ok ? res.data : {}
    }))
  })
})