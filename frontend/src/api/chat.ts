import type { ChatResponse, SessionInfo } from '../types/chat'

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

export async function sendMessage(
  session_id: string,
  user_id: string,
  message: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, user_id, message }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${await parseError(res)}`)
  return res.json() as Promise<ChatResponse>
}

export async function resumeInterrupt(
  session_id: string,
  user_id: string,
  resume_input: Record<string, unknown>,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, user_id, resume_input }),
  })
  if (!res.ok) throw new Error(`Resume failed: ${await parseError(res)}`)
  return res.json() as Promise<ChatResponse>
}

export async function getSessions(user_id: string): Promise<SessionInfo[]> {
  const res = await fetch(`${BASE}/sessions?user_id=${encodeURIComponent(user_id)}`)
  if (!res.ok) throw new Error(`Get sessions failed: ${await parseError(res)}`)
  return res.json() as Promise<SessionInfo[]>
}

export async function getSessionMessages(session_id: string): Promise<any[]> {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(session_id)}/messages`)
  if (!res.ok) return []
  return res.json()
}

export async function getSessionToolCalls(session_id: string): Promise<any[]> {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(session_id)}/tool-calls`)
  if (!res.ok) return []
  return res.json()
}

export async function clearSession(session_id: string): Promise<void> {
  await fetch(`${BASE}/sessions/${encodeURIComponent(session_id)}`, { method: 'DELETE' })
}
