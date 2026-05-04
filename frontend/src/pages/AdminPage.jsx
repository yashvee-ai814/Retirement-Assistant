import { useState, useEffect } from 'react'
import { listDocuments } from '../api/documents.ts'
import DocumentUploader from '../components/admin/DocumentUploader.jsx'
import DocumentList from '../components/admin/DocumentList.jsx'
import { deleteDocument } from '../api/documents.ts'

export default function AdminPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = () => {
    setLoading(true)
    listDocuments()
      .then(setDocuments)
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload pension policy PDFs. The AI will cite them in answers.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-semibold">✕</button>
        </div>
      )}

      <div className="mb-8">
        <DocumentUploader onUploaded={refresh} />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading documents…</div>
      ) : (
        <DocumentList documents={documents} onDelete={handleDelete} />
      )}
    </div>
  )
}
