import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const BASE = "/api"

const authHeaders = async (json = false) => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ""
  return {
    ...(json && { "Content-Type": "application/json" }),
    Authorization: `Bearer ${token}`,
  }
}

export const checkProblem = async (name) => {
  const headers = await authHeaders()
  return fetch(`${BASE}/problems/check?name=${encodeURIComponent(name)}`, { headers }).then(r => r.json())
}

export const getProblems = async () => {
  const headers = await authHeaders()
  return fetch(`${BASE}/problems`, { headers }).then(r => r.json())
}

export const addProblem = async (p) => {
  const headers = await authHeaders(true)
  return fetch(`${BASE}/problems`, { method: "POST", headers, body: JSON.stringify(p) }).then(r => r.json())
}

export const updateProblem = async (id, p) => {
  const headers = await authHeaders(true)
  return fetch(`${BASE}/problems/${id}`, { method: "PUT", headers, body: JSON.stringify(p) }).then(r => r.json())
}

export const deleteProblem = async (id) => {
  const headers = await authHeaders()
  return fetch(`${BASE}/problems/${id}`, { method: "DELETE", headers }).then(r => r.json())
}

export const getReviewQueue = async () => {
  const headers = await authHeaders()
  return fetch(`${BASE}/problems/review`, { headers }).then(r => r.json())
}

export const reviewProblem = async (id, got_it) => {
  const headers = await authHeaders(true)
  return fetch(`${BASE}/problems/${id}/review`, {
    method: "POST", headers, body: JSON.stringify({ got_it })
  }).then(r => r.json())
}

export const getSuggestion = async (problem_name, code, lang) => {
  const headers = await authHeaders(true)
  return fetch(`${BASE}/suggest`, {
    method: "POST", headers, body: JSON.stringify({ problem_name, code, lang })
  }).then(r => r.json())
}