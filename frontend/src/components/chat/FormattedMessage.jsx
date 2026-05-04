function parseInline(text, keyPrefix = '') {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\$\$(.+?)\$\$|\$([^$\d][^$]*?)\$)/g
  const parts = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[2]) parts.push(<strong key={`${keyPrefix}-b-${match.index}`} className="font-semibold text-amber-700 dark:text-amber-300">{match[2]}</strong>)
    else if (match[3]) parts.push(<em key={`${keyPrefix}-i-${match.index}`} className="italic text-slate-600 dark:text-slate-300">{match[3]}</em>)
    else if (match[4]) parts.push(<code key={`${keyPrefix}-c-${match.index}`} className="bg-slate-100 dark:bg-slate-700 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono text-xs">{match[4]}</code>)
    else if (match[5]) parts.push(<span key={`${keyPrefix}-m-${match.index}`} className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 rounded text-xs">{match[5]}</span>)
    else if (match[6]) parts.push(<span key={`${keyPrefix}-mi-${match.index}`} className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 rounded text-xs">{match[6]}</span>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : [text]
}

function GBP(val) {
  if (typeof val !== 'number') return val
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val)
}

function parseTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
}

function isSeparatorRow(cells) {
  return cells.every(cell => /^[-:]+$/.test(cell.trim()))
}

function TableBlock({ rows }) {
  const [header, separator, ...rest] = rows
  const headerCells = parseTableRow(header)
  const bodyRows = rest
    .filter(r => !isSeparatorRow(parseTableRow(r)))
    .map(r => parseTableRow(r))

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-amber-50 dark:bg-amber-950/30">
          <tr>
            {headerCells.map((cell, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                {parseInline(cell, `th${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, i) => (
            <tr key={i} className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-slate-700 dark:text-slate-200 leading-relaxed align-top">
                  {parseInline(cell.replace(/<br\s*\/?>/gi, '\n'), `td${i}-${j}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MathBlock({ content }) {
  return (
    <div className="my-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-x-auto">
      <pre className="text-sm font-mono text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed">{content}</pre>
    </div>
  )
}

function AssessmentBlock({ data }) {
  const labelColour = {
    'On track': 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700',
    'Needs attention': 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700',
    'At risk': 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700',
  }[data.readiness_label] ?? 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'

  const scoreColour = data.readiness_score >= 70
    ? 'text-emerald-600 dark:text-emerald-400'
    : data.readiness_score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-3 mt-1">
      <div className="flex items-center gap-3">
        <span className={`text-4xl font-bold font-display ${scoreColour}`}>
          {data.readiness_score}<span className="text-xl">/100</span>
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${labelColour}`}>
          {data.readiness_label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Projected Pot', value: GBP(data.projected_pot), color: 'indigo' },
          { label: 'Annual Income', value: GBP(data.projected_annual_income), color: 'emerald' },
          { label: 'Shortfall', value: GBP(data.shortfall), color: data.shortfall > 0 ? 'red' : 'emerald' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-sm font-bold ${
              color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
              : color === 'red' ? 'text-red-600 dark:text-red-400'
              : 'text-indigo-600 dark:text-indigo-300'
            }`}>{value}</p>
          </div>
        ))}
      </div>
      {data.summary && <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.summary}</p>}
      {data.action_steps?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Recommended Actions</p>
          {data.action_steps.map((step, i) => {
            const dot = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' }[step.priority] ?? 'bg-slate-400'
            return (
              <div key={i} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-transparent rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{step.action}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.reason}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {data.disclaimer && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic border-t border-slate-200 dark:border-slate-700 pt-2">{data.disclaimer}</p>
      )}
    </div>
  )
}

function renderLines(content) {
  const lines = content.split('\n')
  const elements = []
  let bulletBuf = []
  let numberedBuf = []
  let tableBuf = []
  let mathBuf = []
  let inMathBlock = false
  let key = 0

  const flushBullets = () => {
    if (!bulletBuf.length) return
    elements.push(
      <ul key={key++} className="space-y-1.5 my-2">
        {bulletBuf.map((item, j) => (
          <li key={j} className="flex gap-2 items-start text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0">◆</span>
            <span>{parseInline(item, `b${j}`)}</span>
          </li>
        ))}
      </ul>
    )
    bulletBuf = []
  }

  const flushNumbered = () => {
    if (!numberedBuf.length) return
    elements.push(
      <ol key={key++} className="space-y-1.5 my-2">
        {numberedBuf.map((item, j) => (
          <li key={j} className="flex gap-2 items-start text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="text-amber-500 dark:text-amber-400 font-semibold shrink-0 min-w-[1.25rem]">{j + 1}.</span>
            <span>{parseInline(item, `n${j}`)}</span>
          </li>
        ))}
      </ol>
    )
    numberedBuf = []
  }

  const flushTable = () => {
    if (!tableBuf.length) return
    elements.push(<TableBlock key={key++} rows={tableBuf} />)
    tableBuf = []
  }

  const flushMath = () => {
    if (!mathBuf.length) return
    elements.push(<MathBlock key={key++} content={mathBuf.join('\n')} />)
    mathBuf = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (inMathBlock) {
      if (trimmed === '$$') {
        flushMath()
        inMathBlock = false
      } else {
        mathBuf.push(line)
      }
      continue
    }

    if (trimmed === '$$') {
      flushBullets(); flushNumbered(); flushTable()
      inMathBlock = true
      continue
    }

    // Single-line block math: $$...$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      flushBullets(); flushNumbered(); flushTable()
      elements.push(<MathBlock key={key++} content={trimmed.slice(2, -2).trim()} />)
      continue
    }

    // Table row
    if (trimmed.startsWith('|')) {
      flushBullets(); flushNumbered()
      tableBuf.push(line)
      continue
    }

    // Leaving a table
    flushTable()

    if (trimmed.startsWith('### ')) {
      flushBullets(); flushNumbered()
      elements.push(<h3 key={key++} className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-3 mb-1">{trimmed.slice(4)}</h3>)
    } else if (trimmed.startsWith('## ')) {
      flushBullets(); flushNumbered()
      elements.push(<h2 key={key++} className="text-base font-bold text-amber-700 dark:text-amber-400 mt-3 mb-1">{trimmed.slice(3)}</h2>)
    } else if (trimmed.startsWith('# ')) {
      flushBullets(); flushNumbered()
      elements.push(<h1 key={key++} className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-3 mb-1 font-display">{trimmed.slice(2)}</h1>)
    } else if (/^[-*] /.test(trimmed)) {
      flushNumbered(); bulletBuf.push(trimmed.slice(2))
    } else if (/^\d+\. /.test(trimmed)) {
      flushBullets(); numberedBuf.push(trimmed.replace(/^\d+\. /, ''))
    } else if (trimmed === '') {
      flushBullets(); flushNumbered()
      if (elements.length > 0) elements.push(<div key={key++} className="h-1.5" />)
    } else {
      flushBullets(); flushNumbered()
      elements.push(
        <p key={key++} className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {parseInline(line, `p${i}`)}
        </p>
      )
    }
  }

  flushBullets(); flushNumbered(); flushTable(); flushMath()
  return elements
}

export default function FormattedMessage({ content, isUser }) {
  if (isUser) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  const trimmed = content.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed)
      if (data.readiness_score !== undefined) return <AssessmentBlock data={data} />
      return (
        <div className="space-y-1.5">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex gap-2 flex-wrap text-sm">
              <span className="text-amber-600 dark:text-amber-400 font-medium capitalize shrink-0">{k.replace(/_/g, ' ')}:</span>
              <span className="text-slate-700 dark:text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )
    } catch {}
  }

  return <div className="space-y-0.5">{renderLines(trimmed)}</div>
}
