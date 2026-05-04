import type { User } from '../types/auth'

const BASE = 'http://localhost:8000'

async function parseError(res: Response): Promise<string> {
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    detail = body.detail ?? detail
  } catch {
    detail = await res.text()
  }
  return detail
}

export async function login(username: string): Promise<User> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (!res.ok) throw new Error(`Login failed: ${await parseError(res)}`)
  return res.json() as Promise<User>
}

export async function getMe(user_id: string): Promise<User> {
  const res = await fetch(`${BASE}/auth/me?user_id=${encodeURIComponent(user_id)}`)
  if (!res.ok) throw new Error(`Get me failed: ${await parseError(res)}`)
  return res.json() as Promise<User>
}
