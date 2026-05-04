import type { DocumentInfo } from '../types/document'

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

export async function uploadDocument(file: File): Promise<DocumentInfo> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/admin/documents`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed: ${await parseError(res)}`)
  return res.json() as Promise<DocumentInfo>
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${BASE}/admin/documents`)
  if (!res.ok) throw new Error(`List documents failed: ${await parseError(res)}`)
  return res.json() as Promise<DocumentInfo[]>
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete failed: ${await parseError(res)}`)
}
