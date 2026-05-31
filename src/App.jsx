import { useState, useMemo, useEffect } from 'react'
import { supabase, getProblems, addProblem, updateProblem, deleteProblem, getSuggestion, getReviewQueue, reviewProblem } from './api'

const TOPICS = ["Array","String","HashMap","Two Pointers","Sliding Window","Binary Search","Linked List","Tree","Graph","BFS","DFS","Dynamic Programming","Backtracking","Stack","Heap","Greedy","Math","Bit Manipulation","Other"]
const DIFFICULTIES = ["Easy","Medium","Hard"]
const STATUSES = ["Solved","Attempted","Revisit"]

const diffColor  = { Easy: "#3B6D11", Medium: "#854F0B", Hard: "#A32D2D" }
const diffBg     = { Easy: "#EAF3DE", Medium: "#FAEEDA", Hard: "#FCEBEB" }
const statusColor = { Solved: "#0F6E56", Attempted: "#185FA5", Revisit: "#993556" }
const statusBg    = { Solved: "#E1F5EE", Attempted: "#E6F1FB", Revisit: "#FBEAF0" }

const defaultForm = { number: "", name: "", difficulty: "Easy", topic: "Array", status: "Solved", timeComplexity: "", note: "" }

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg-page); color: var(--text-primary); }
  :root {
    --bg-page: #f5f5f7; --bg-surface: #ffffff; --bg-subtle: #f9fafb; --bg-hover: #f3f4f6;
    --border: #e5e7eb; --border-input: #d1d5db;
    --text-primary: #111827; --text-secondary: #6b7280; --text-muted: #9ca3af;
    --btn-primary-bg: #4f46e5; --btn-primary-fg: #ffffff;
    --accent: #4f46e5; --accent-light: #eef2ff;
    --radius: 12px; --radius-sm: 8px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page: #0d0f14; --bg-surface: #161922; --bg-subtle: #1e2130; --bg-hover: #252840;
      --border: #2a2e42; --border-input: #353a52;
      --text-primary: #eef0f8; --text-secondary: #8b92b3; --text-muted: #555e7a;
      --btn-primary-bg: #6366f1; --btn-primary-fg: #ffffff;
      --accent: #6366f1; --accent-light: #1e1f3a;
    }
  }
  input, select {
    background: var(--bg-surface); color: var(--text-primary);
    border: 1px solid var(--border-input); border-radius: var(--radius-sm);
    padding: 8px 12px; font-size: 14px; width: 100%; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .stat-card {
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px 18px;
    transition: border-color 0.15s, transform 0.15s;
  }
  .stat-card:hover { border-color: var(--accent); transform: translateY(-1px); }
  .btn-primary {
    padding: 9px 20px; border-radius: var(--radius-sm); border: none;
    background: var(--btn-primary-bg); color: var(--btn-primary-fg);
    cursor: pointer; font-size: 14px; font-weight: 500;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-secondary {
    padding: 8px 16px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-input);
    background: var(--bg-surface); color: var(--text-primary);
    cursor: pointer; font-size: 14px; font-weight: 500;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-secondary:hover { background: var(--bg-subtle); border-color: var(--accent); color: var(--accent); }
  .btn-sm {
    padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--bg-subtle); color: var(--text-secondary);
    cursor: pointer; font-size: 12px; font-weight: 500;
    transition: background 0.15s, color 0.15s;
  }
  .btn-sm:hover { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
  .btn-danger {
    padding: 4px 8px; border-radius: 6px; border: 1px solid #fca5a5;
    background: var(--bg-subtle); color: #dc2626; cursor: pointer; font-size: 14px;
    transition: background 0.15s;
  }
  .btn-danger:hover { background: #fee2e2; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; }
  thead tr { background: var(--bg-subtle); }
  th {
    padding: 11px 14px; text-align: left; font-weight: 600;
    font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  td { padding: 13px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr { background: var(--bg-surface); transition: background 0.1s; }
  tbody tr:hover { background: var(--bg-hover); }
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 4rem 2rem; gap: 8px;
  }
  .empty-icon { font-size: 36px; margin-bottom: 8px; }
`

const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: bg, color, whiteSpace: "nowrap" }}>{label}</span>
)

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMagicSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" })
  }

  if (magicSent) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12 }}>
      <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Check your email</h2>
      <p style={{ color: "var(--text-secondary)", margin: 0 }}>We sent a confirmation link to {email}</p>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="card" style={{ padding: "2rem", width: "100%", maxWidth: 380 }}>
        <h2 style={{ margin: "0 0 1.5rem", fontSize: 22, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
          LeetCode Tracker
        </h2>
        {error && (
          <div style={{ background: "#FCEBEB", color: "#A32D2D", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <button className="btn-primary" style={{ width: "100%", padding: "10px", fontSize: 15 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : isSignUp ? "Create account" : "Sign in"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <button className="btn-secondary" style={{ width: "100%", padding: "10px" }} onClick={handleGoogle}>
          Continue with Google
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 16, marginBottom: 0 }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Sign in" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  )
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
function ReviewQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState([])

  useEffect(() => {
    getReviewQueue().then(data => {
      setQueue(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleReview = async (id, gotIt) => {
    await reviewProblem(id, gotIt)
    setDone(prev => [...prev, id])
  }

  const pending = queue.filter(p => !done.includes(p.id))
  const reviewed = queue.filter(p => done.includes(p.id))

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading...</div>
  )

  return (
    <div>
      {pending.length === 0 && reviewed.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>All caught up!</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No problems due for review today</div>
        </div>
      )}
      {pending.length === 0 && reviewed.length > 0 && (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>Session complete!</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>You reviewed {reviewed.length} problem{reviewed.length > 1 ? "s" : ""} today</div>
        </div>
      )}
      {pending.map(p => (
        <div key={p.id} className="card" style={{ padding: "1.25rem", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>#{p.number}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</span>
                <Badge label={p.difficulty} color={diffColor[p.difficulty]} bg={diffBg[p.difficulty]} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: p.note ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-subtle)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>{p.topic}</span>
                {p.timeComplexity && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace", background: "var(--bg-subtle)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>{p.timeComplexity}</span>
                )}
              </div>
              {p.note && (
                <div style={{ fontSize: 13, color: "var(--accent)", fontStyle: "italic", marginTop: 6 }}>"{p.note}"</div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Due: {p.nextReview} · Interval: {p.reviewInterval}d
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
              <button className="btn-primary" style={{ fontSize: 13, padding: "8px 12px" }}
                onClick={() => handleReview(p.id, true)}>Got it ✓</button>
              <button className="btn-secondary" style={{ fontSize: 13, padding: "8px 12px" }}
                onClick={() => handleReview(p.id, false)}>Need practice</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tracker ──────────────────────────────────────────────────────────────────
function Tracker({ user }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(defaultForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterTopic, setFilterTopic] = useState("All")
  const [filterDiff, setFilterDiff] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [suggesting, setSuggesting] = useState(false)
  const [activeTab, setActiveTab] = useState("problems")
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    getReviewQueue().then(data => {
      if (Array.isArray(data)) setReviewCount(data.length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const data = await getProblems()
        setProblems(Array.isArray(data) ? data : [])
      } catch {
        setError("Failed to load problems.")
        setProblems([])
      } finally {
        setLoading(false)
      }
    })()
    const interval = setInterval(async () => {
      try {
        const data = await getProblems()
        if (Array.isArray(data)) setProblems(data)
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSuggest = async () => {
    if (!form.name) return
    setSuggesting(true)
    try {
      const result = await getSuggestion(form.name, "", "")
      setForm(f => ({
        ...f,
        note: result.note ?? f.note,
        topic: result.topic ?? f.topic,
        timeComplexity: result.timeComplexity ?? f.timeComplexity,
      }))
    } catch {
      setError("AI suggestion failed.")
    } finally {
      setSuggesting(false)
    }
  }

  const nextNumber = useMemo(() => {
    const list = Array.isArray(problems) ? problems : []
    const max = list.reduce((acc, p) => {
      const n = parseInt(p.number)
      return isNaN(n) ? acc : Math.max(acc, n)
    }, 0)
    return String(max + 1)
  }, [problems])

  const filtered = useMemo(() => (Array.isArray(problems) ? problems : []).filter(p => {
    if (filterTopic !== "All" && p.topic !== filterTopic) return false
    if (filterDiff !== "All" && p.difficulty !== filterDiff) return false
    if (filterStatus !== "All" && p.status !== filterStatus) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.number.includes(search)) return false
    return true
  }), [problems, filterTopic, filterDiff, filterStatus, search])

  const stats = useMemo(() => {
    const list = Array.isArray(problems) ? problems : []
    return {
      total: list.length,
      easy: list.filter(p => p.difficulty === "Easy").length,
      medium: list.filter(p => p.difficulty === "Medium").length,
      hard: list.filter(p => p.difficulty === "Hard").length,
      revisit: list.filter(p => p.status === "Revisit").length,
    }
  }, [problems])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    try {
      const payload = { ...form, date: new Date().toISOString().split("T")[0] }
      if (editId) {
        const updated = await updateProblem(editId, payload)
        setProblems(prev => prev.map(p => p.id === editId ? updated : p))
        setEditId(null)
      } else {
        const created = await addProblem(payload)
        setProblems(prev => [created, ...prev])
      }
      setForm(defaultForm)
      setShowForm(false)
    } catch {
      setError("Failed to save problem.")
    }
  }

  const handleEdit = (p) => {
    setForm({ number: p.number, name: p.name, difficulty: p.difficulty, topic: p.topic, status: p.status, timeComplexity: p.timeComplexity, note: p.note })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteProblem(id)
      setProblems(prev => prev.filter(p => p.id !== id))
    } catch {
      setError("Failed to delete problem.")
    }
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>LeetCode Tracker</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{user.email}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-secondary" onClick={() => {
            setShowForm(!showForm)
            setEditId(null)
            setForm({ ...defaultForm, number: nextNumber })
          }}>
            {showForm ? "✕ Cancel" : "+ Add problem"}
          </button>
          <button className="btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        {[
          { id: "problems", label: "Problems" },
          { id: "review", label: `Review${reviewCount > 0 ? ` (${reviewCount})` : ""}` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 500,
            color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, transition: "color 0.15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#FCEBEB", color: "#A32D2D", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D" }}>✕</button>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && <ReviewQueue />}

      {/* Problems Tab */}
      {activeTab === "problems" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12, marginBottom: "1.75rem" }}>
            {[
              { label: "Total solved", value: stats.total, color: "var(--accent)" },
              { label: "Easy", value: stats.easy, color: "#16a34a" },
              { label: "Medium", value: stats.medium, color: "#d97706" },
              { label: "Hard", value: stats.hard, color: "#dc2626" },
              { label: "To revisit", value: stats.revisit, color: "#9333ea" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Form */}
          {showForm && (
            <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>#</label>
                  <input placeholder="1" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Problem name</label>
                  <input placeholder="e.g. Two Sum" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[
                  { label: "Difficulty", key: "difficulty", options: DIFFICULTIES },
                  { label: "Topic / pattern", key: "topic", options: TOPICS },
                  { label: "Status", key: "status", options: STATUSES },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
                    <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Time complexity</label>
                  <input placeholder="e.g. O(n)" value={form.timeComplexity} onChange={e => setForm(f => ({ ...f, timeComplexity: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Key insight / note</label>
                <input placeholder="e.g. use hashmap to store complement" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-primary" onClick={handleSubmit}>{editId ? "Save changes" : "Add problem"}</button>
                <button className="btn-secondary" onClick={handleSuggest} disabled={suggesting} style={{ fontSize: 13 }}>
                  {suggesting ? "Thinking..." : "✦ AI suggest"}
                </button>
                {suggesting && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Analyzing...</span>}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
            <input style={{ width: 200 }} placeholder="Search by name or #" value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ width: 140 }} value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              <option value="All">All topics</option>
              {TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ width: 140 }} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
              <option value="All">All difficulties</option>
              {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
            </select>
            <select style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading...</div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <table>
                <thead>
                  <tr>
                    {["#","Problem","Difficulty","Topic","Status","Complexity","Note","Date",""].map((h, i) => (
                      <th key={i} style={{ width: ["50px","auto","100px","130px","95px","100px","150px","100px","90px"][i] }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-icon">📭</div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>No problems yet</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Add your first problem or solve one on LeetCode</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((p, idx) => (
                    <tr key={p.id ?? idx}>
                      <td style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>{p.number || "—"}</td>
                      <td style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                      <td><Badge label={p.difficulty} color={diffColor[p.difficulty]} bg={diffBg[p.difficulty]} /></td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.topic}</td>
                      <td><Badge label={p.status} color={statusColor[p.status]} bg={statusBg[p.status]} /></td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "monospace" }}>{p.timeComplexity || "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.note}>{p.note || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{p.date}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                          <button className="btn-danger" onClick={() => handleDelete(p.id)} title="Delete" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 7px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      sendTokenToExtension(session?.access_token)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      sendTokenToExtension(session?.access_token)
    })
    return () => subscription.unsubscribe()
  }, [])

  function sendTokenToExtension(token) {
    if (!token) return
    try { localStorage.setItem("lct_token", token) } catch {}
  }

  if (authLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-secondary)" }}>
      Loading...
    </div>
  )

  return (
    <>
      <style>{css}</style>
      {user ? <Tracker user={user} /> : <AuthScreen />}
    </>
  )
}