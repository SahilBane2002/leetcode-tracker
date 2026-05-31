const originalFetch = window.fetch
window.fetch = async (...args) => {
  const res = await originalFetch(...args)
  const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? ""
  if (url.includes("/submissions/detail/") && url.includes("/check/")) {
    try {
      const clone = res.clone()
      const data = await clone.json()
      if (data.status_msg === "Accepted") {
        const problemData = extractProblemData(data)
        showStep1(problemData)
      }
    } catch (e) {
      console.error("[LCT] Failed to parse submission:", e)
    }
  }
  return res
}

function extractProblemData(data) {
  const titleEl = document.querySelector("[data-cy='question-title']")
    ?? document.querySelector(".text-title-large a")
    ?? document.querySelector("title")
  const rawTitle = titleEl?.textContent?.trim() ?? document.title
  const match = rawTitle.match(/^(\d+)\.\s+(.+)$/)
  const number = match?.[1] ?? ""
  const name   = match?.[2] ?? rawTitle.replace(" - LeetCode", "").trim()
  const diffEl = [...document.querySelectorAll("*")].find(el =>
    ["Easy","Medium","Hard"].includes(el.textContent?.trim()) && el.children.length === 0
  )
  const difficulty = ["Easy","Medium","Hard"].includes(diffEl?.textContent?.trim())
    ? diffEl.textContent.trim() : "Medium"
  return {
    number,
    name,
    difficulty,
    code:    data.code ?? "",
    lang:    data.lang ?? "",
    runtime: data.status_runtime ?? "",
    memory:  data.status_memory ?? ""
  }
}

const TOPICS   = ["Array","String","HashMap","Two Pointers","Sliding Window","Binary Search","Linked List","Tree","Graph","BFS","DFS","Dynamic Programming","Backtracking","Stack","Heap","Greedy","Math","Bit Manipulation","Other"]
const STATUSES = ["Solved","Attempted","Revisit"]
const diffStyle = {
  Easy:   "background:#EAF3DE;color:#3B6D11;",
  Medium: "background:#FAEEDA;color:#854F0B;",
  Hard:   "background:#FCEBEB;color:#A32D2D;"
}

function removePopup() { document.getElementById("lct-popup")?.remove() }

const SHARED_CSS = `
  <style>
    @keyframes lct-in { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
    #lct-popup * { box-sizing:border-box; font-family:system-ui,sans-serif; }
    #lct-popup input, #lct-popup select, #lct-popup textarea {
      width:100%; background:#22263a; color:#f1f3f9; border:1px solid #3a3f55;
      border-radius:7px; padding:7px 10px; font-size:13px; outline:none; margin-top:3px;
    }
    #lct-popup input:focus, #lct-popup select:focus, #lct-popup textarea:focus { border-color:#6366f1; }
    #lct-popup label { font-size:11px; color:#9ca3b8; display:block; margin-top:10px; text-transform:uppercase; letter-spacing:0.04em; }
    #lct-popup .lct-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    #lct-popup .lct-btn-primary {
      flex:1; padding:9px; border-radius:8px; border:none;
      background:#6366f1; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:opacity 0.15s;
    }
    #lct-popup .lct-btn-primary:hover { opacity:0.85; }
    #lct-popup .lct-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    #lct-popup .lct-btn-secondary {
      flex:1; padding:9px; border-radius:8px;
      border:1px solid #3a3f55; background:transparent;
      color:#9ca3b8; font-size:13px; cursor:pointer;
    }
    #lct-popup .lct-btn-secondary:hover { background:#22263a; }
    #lct-popup .lct-ai-btn {
      width:100%; margin-top:8px; padding:7px; border-radius:7px;
      border:1px solid #4f46e5; background:#1e1f3a;
      color:#818cf8; font-size:12px; cursor:pointer; font-weight:500;
    }
    #lct-popup .lct-ai-btn:hover { background:#2d2f5a; }
    #lct-popup .lct-ai-btn:disabled { opacity:0.5; cursor:not-allowed; }
    #lct-popup .lct-close {
      position:absolute; top:12px; right:14px; background:none;
      border:none; color:#6b7280; cursor:pointer; font-size:16px; line-height:1; padding:0;
    }
  </style>
`

function popupBase(width = "300px") {
  const el = document.createElement("div")
  el.id = "lct-popup"
  el.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:99999; width:${width};
    background:#1a1d27; border:1px solid #2e3347; border-radius:14px; padding:20px;
    font-family:system-ui,sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.5);
    animation:lct-in 0.2s ease;
  `
  return el
}

// ── Duplicate detected ────────────────────────────────────────────────────────
function showDuplicate(newData, existing) {
  removePopup()
  const el = popupBase("340px")
  el.innerHTML = `
    ${SHARED_CSS}
    <button class="lct-close" onclick="document.getElementById('lct-popup').remove()">✕</button>
    <div style="font-size:14px;font-weight:700;color:#f1f3f9;margin-bottom:4px">Already solved! 🔁</div>
    <div style="font-size:12px;color:#9ca3b8;margin-bottom:12px">You've logged this problem before:</div>

    <div style="background:#22263a;border-radius:8px;padding:12px;margin-bottom:14px;font-size:13px">
      <div style="color:#f1f3f9;font-weight:600;margin-bottom:6px">${existing.name}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;${diffStyle[existing.difficulty]??diffStyle.Medium}">${existing.difficulty}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#2e3347;color:#9ca3b8">${existing.topic}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#2e3347;color:#9ca3b8">${existing.timeComplexity || "?"}</span>
      </div>
      ${existing.note ? `<div style="font-size:12px;color:#818cf8;font-style:italic">"${existing.note}"</div>` : ""}
      <div style="font-size:11px;color:#555e7a;margin-top:6px">Logged on ${existing.date}</div>
    </div>

    <div style="font-size:12px;color:#9ca3b8;margin-bottom:10px">What would you like to do?</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="lct-btn-primary" id="lct-update">Update with new approach</button>
      <button class="lct-btn-secondary" id="lct-new-attempt">Log as new attempt</button>
      <button class="lct-btn-secondary" onclick="document.getElementById('lct-popup').remove()" style="color:#555e7a">Skip</button>
    </div>
  `
  document.body.appendChild(el)

  // Update existing entry — open form pre-filled with existing data
  document.getElementById("lct-update").onclick = () => {
    console.log("[LCT] Updating existing problem id:", existing.id)
    showStep2(newData, existing)
  }

  // Log as completely new entry — pass null explicitly
  document.getElementById("lct-new-attempt").onclick = () => showStep2({ ...newData }, null)
}

// ── Step 1: Accepted notification ─────────────────────────────────────────────
function showStep1(data) {
  removePopup()
  const el = popupBase("300px")
  el.innerHTML = `
    ${SHARED_CSS}
    <button class="lct-close" onclick="document.getElementById('lct-popup').remove()">✕</button>
    <div style="font-size:15px;font-weight:700;color:#f1f3f9;margin-bottom:3px">Accepted! 🎉</div>
    <div style="font-size:13px;color:#9ca3b8;margin-bottom:10px">${data.name}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;${diffStyle[data.difficulty]??diffStyle.Medium}">${data.difficulty}</span>
      <span style="font-size:12px;color:#6b7280">${data.runtime} · ${data.memory}</span>
    </div>
    <div style="font-size:13px;color:#9ca3b8;margin-bottom:14px">Add this to your tracker?</div>
    <div style="display:flex;gap:8px">
      <button class="lct-btn-primary" id="lct-yes">Log it</button>
      <button class="lct-btn-secondary" onclick="document.getElementById('lct-popup').remove()">Skip</button>
    </div>
  `
  document.body.appendChild(el)
  document.getElementById("lct-yes").onclick = () => {
    // Check for duplicate before showing form
    window.dispatchEvent(new CustomEvent("lct-check-problem", { detail: { name: data.name } }))
    window.addEventListener("lct-check-result", (e) => {
      const res = e.detail
      if (res.exists) {
        showDuplicate(data, res.problem)
      } else {
        showStep2(data)
      }
    }, { once: true })
  }
  setTimeout(() => removePopup(), 30000)
}

// ── Step 2: Fill in form ───────────────────────────────────────────────────────
function showStep2(data, existing = null) {
  removePopup()
  const el = popupBase("340px")
  el.style.maxHeight = "90vh"
  el.style.overflowY = "auto"

  const isUpdate = !!existing
  const topicOptions  = TOPICS.map(t =>
    `<option value="${t}" ${(existing?.topic ?? "Other") === t ? "selected" : ""}>${t}</option>`
  ).join("")
  const statusOptions = STATUSES.map(s =>
    `<option value="${s}" ${(existing?.status ?? "Solved") === s ? "selected" : ""}>${s}</option>`
  ).join("")

  el.innerHTML = `
    ${SHARED_CSS}
    <button class="lct-close" onclick="document.getElementById('lct-popup').remove()">✕</button>
    <div style="font-size:14px;font-weight:700;color:#f1f3f9;margin-bottom:14px">
      ${isUpdate ? "Update entry ✏️" : "Log problem"}
    </div>

    <label>Problem name</label>
    <input id="lct-name" value="${(isUpdate ? existing.name : data.name).replace(/"/g, '&quot;')}" />

    <div class="lct-row">
      <div>
        <label>Difficulty</label>
        <select id="lct-diff">
          <option ${data.difficulty==="Easy"?"selected":""}>Easy</option>
          <option ${data.difficulty==="Medium"?"selected":""}>Medium</option>
          <option ${data.difficulty==="Hard"?"selected":""}>Hard</option>
        </select>
      </div>
      <div>
        <label>Status</label>
        <select id="lct-status">${statusOptions}</select>
      </div>
    </div>

    <div class="lct-row">
      <div>
        <label>Topic / pattern</label>
        <select id="lct-topic">${topicOptions}</select>
      </div>
      <div>
        <label>Time complexity</label>
        <input id="lct-complexity" placeholder="O(n)" value="${(existing?.timeComplexity ?? "").replace(/"/g, '&quot;')}" />
      </div>
    </div>

    <label>Key insight / note</label>
    <textarea id="lct-note" rows="2" placeholder="e.g. use hashmap to store complement" style="resize:none">${existing?.note ?? ""}</textarea>

    <button class="lct-ai-btn" id="lct-ai">✦ AI suggest</button>
    <div id="lct-ai-status" style="font-size:11px;color:#818cf8;margin-top:4px;min-height:14px"></div>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="lct-btn-primary" id="lct-save">${isUpdate ? "Update" : "Save"}</button>
      <button class="lct-btn-secondary" onclick="document.getElementById('lct-popup').remove()">Cancel</button>
    </div>
  `
  document.body.appendChild(el)

  // AI suggest
  document.getElementById("lct-ai").onclick = () => {
    document.getElementById("lct-ai-status").textContent = "Thinking..."
    document.getElementById("lct-ai-status").style.color = "#818cf8"
    document.getElementById("lct-ai").disabled = true
    window.dispatchEvent(new CustomEvent("lct-suggest", {
      detail: { name: data.name, code: data.code, lang: data.lang }
    }))
  }

  window.addEventListener("lct-suggestion-result", (e) => {
    const s = e.detail
    if (s.note)           document.getElementById("lct-note").value = s.note
    if (s.topic)          document.getElementById("lct-topic").value = s.topic
    if (s.timeComplexity) document.getElementById("lct-complexity").value = s.timeComplexity
    document.getElementById("lct-ai-status").textContent = "✓ Filled in by AI"
    document.getElementById("lct-ai").disabled = false
  }, { once: true })

  // Save
  document.getElementById("lct-save").onclick = () => {
    const btn = document.getElementById("lct-save")
    btn.disabled = true
    btn.textContent = isUpdate ? "Updating..." : "Saving..."
    const payload = {
      number:         existing?.number ?? data.number,
      name:           document.getElementById("lct-name").value,
      difficulty:     document.getElementById("lct-diff").value,
      status:         document.getElementById("lct-status").value,
      topic:          document.getElementById("lct-topic").value,
      timeComplexity: document.getElementById("lct-complexity").value,
      note:           document.getElementById("lct-note").value,
      date:           new Date().toISOString().split("T")[0],
    }

    if (isUpdate) {
      window.dispatchEvent(new CustomEvent("lct-update-problem", {
        detail: { id: existing.id, payload }
      }))
    } else {
      window.dispatchEvent(new CustomEvent("lct-save-problem", { detail: payload }))
    }

    window.addEventListener("lct-save-success", () => showStep3(), { once: true })
    window.addEventListener("lct-save-error", (e) => {
      btn.disabled = false
      btn.textContent = isUpdate ? "Update" : "Save"
      document.getElementById("lct-ai-status").textContent = "⚠ " + e.detail
      document.getElementById("lct-ai-status").style.color = "#f87171"
    }, { once: true })
  }
}

// ── Step 3: Success confirmation ───────────────────────────────────────────────
function showStep3() {
  removePopup()
  const el = popupBase("260px")
  el.style.textAlign = "center"
  el.innerHTML = `
    ${SHARED_CSS}
    <div style="font-size:32px;margin-bottom:8px">✅</div>
    <div style="font-size:15px;font-weight:700;color:#f1f3f9;margin-bottom:4px">Logged!</div>
    <div style="font-size:13px;color:#9ca3b8">Problem saved to your tracker</div>
  `
  document.body.appendChild(el)
  setTimeout(() => removePopup(), 2500)
}