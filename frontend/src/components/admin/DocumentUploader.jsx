import { useState, useRef } from 'react'
import { uploadDocument } from '../../api/documents.ts'
import LoadingSpinner from '../shared/LoadingSpinner.jsx'

export default function DocumentUploader({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadDocument(file)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150 ${
        dragging
          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-800/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {uploading ? (
        <LoadingSpinner />
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`w-10 h-10 mb-3 ${dragging ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Drop a PDF here or <span className="text-amber-600 dark:text-amber-400 underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pension policy PDFs only</p>
        </>
      )}

      {error && (
        <p className="absolute bottom-3 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
