import type { UserProfile } from '../types/profile'

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

export async function getProfile(user_id: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/users/${encodeURIComponent(user_id)}/profile`)
  if (!res.ok) throw new Error(`Get profile failed: ${await parseError(res)}`)
  return res.json() as Promise<UserProfile>
}

export async function updateProfile(user_id: string, data: UserProfile): Promise<UserProfile> {
  const res = await fetch(`${BASE}/users/${encodeURIComponent(user_id)}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update profile failed: ${await parseError(res)}`)
  return res.json() as Promise<UserProfile>
}
