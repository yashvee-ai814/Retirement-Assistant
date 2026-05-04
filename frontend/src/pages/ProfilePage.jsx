import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getProfile, updateProfile } from '../api/profile.ts'
import ProfileForm from '../components/profile/ProfileForm.jsx'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    getProfile(user.user_id)
      .then(setProfile)
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [user])

  const handleSave = async (data) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateProfile(user.user_id, data)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const filled = Object.values(profile).filter((v) => v != null).length
  const total = 8

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {filled}/{total} fields completed
        </p>
        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${(filled / total) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/50 rounded-xl px-4 py-3">
          Profile saved successfully.
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading…</div>
      ) : (
        <ProfileForm profile={profile} onSave={handleSave} loading={saving} />
      )}
    </div>
  )
}
