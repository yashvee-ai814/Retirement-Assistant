import { useState, useEffect } from 'react'

const FIELDS = [
  { key: 'age', label: 'Current Age', type: 'number', placeholder: '42', unit: 'years', min: 16, max: 100 },
  { key: 'current_pot', label: 'Current Pension Pot', type: 'number', placeholder: '35000', unit: '£', min: 0 },
  { key: 'monthly_personal', label: 'Monthly Personal Contribution', type: 'number', placeholder: '400', unit: '£/mo', min: 0 },
  { key: 'monthly_employer', label: 'Monthly Employer Contribution', type: 'number', placeholder: '200', unit: '£/mo', min: 0 },
  { key: 'target_annual_income', label: 'Target Annual Retirement Income', type: 'number', placeholder: '24000', unit: '£/yr', min: 0 },
  { key: 'retirement_age', label: 'Planned Retirement Age', type: 'number', placeholder: '65', unit: 'years', min: 55, max: 80 },
  { key: 'annual_growth_rate', label: 'Annual Growth Rate', type: 'number', placeholder: '5', unit: '%', min: 0, max: 30, isPercent: true },
  { key: 'inflation_rate', label: 'Inflation Rate', type: 'number', placeholder: '2.5', unit: '%', min: 0, max: 20, isPercent: true },
]

export default function ProfileForm({ profile, onSave, loading }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    const initial = {}
    for (const f of FIELDS) {
      const val = profile[f.key]
      if (val != null) {
        initial[f.key] = f.isPercent ? String(Math.round(val * 100 * 10) / 10) : String(val)
      } else {
        initial[f.key] = ''
      }
    }
    setForm(initial)
  }, [profile])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {}
    for (const f of FIELDS) {
      const raw = form[f.key]
      if (raw !== '' && raw != null) {
        const num = parseFloat(raw)
        if (!isNaN(num)) {
          data[f.key] = f.isPercent ? num / 100 : num
        }
      }
    }
    onSave(data)
  }

  const filled = FIELDS.filter((f) => form[f.key] !== '' && form[f.key] != null).length

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
        {filled}/{FIELDS.length} fields filled
      </div>

      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {f.label}
            <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">({f.unit})</span>
          </label>
          <input
            type="number"
            step="any"
            min={f.min}
            max={f.max}
            value={form[f.key] ?? ''}
            onChange={(e) => handleChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none disabled:opacity-40 transition-colors text-sm"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-amber-500/20"
      >
        {loading ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  )
}
