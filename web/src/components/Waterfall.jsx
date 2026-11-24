import { motion, useReducedMotion } from 'framer-motion'
import { signedMoney } from '../format'

export const EFFECTS = [
  { key: 'volume_effect', name: 'Traveller numbers', note: 'more or fewer passengers', color: 'var(--c-vol)' },
  { key: 'published_price_effect', name: 'Published fee increases', note: 'GTAA rate changes', color: 'var(--c-price)' },
  { key: 'other_per_pax_effect', name: 'Other per-traveller gains', note: 'bigger planes, spending, mix', color: 'var(--c-other)' },
  { key: 'interaction_effect', name: 'Interaction', note: 'both changing at once', color: 'var(--c-inter)' },
]

/** Change-only waterfall: each effect steps from the running total, ending at the total change. */
export default function Waterfall({ row, height = 26 }) {
  const reduce = useReducedMotion()
  if (!row) return null
  let run = 0
  const steps = EFFECTS.map((e) => {
    const v = Number(row[e.key]) || 0
    const from = run
    run += v
    return { ...e, v, from, to: run }
  })
  const total = Number(row.revenue_change)
  const pts = [0, total, ...steps.flatMap((s) => [s.from, s.to])]
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const span = hi - lo || 1
  const x = (v) => ((v - lo) / span) * 100

  const bar = ({ from, to, color, i, cls }) => (
    <motion.div
      className={`wf-bar ${cls || ''}`}
      style={{ left: `${x(Math.min(from, to))}%`, background: color, height: height - 6 }}
      initial={false}
      animate={{ width: `${Math.max(x(Math.max(from, to)) - x(Math.min(from, to)), 0.4)}%`, left: `${x(Math.min(from, to))}%` }}
      transition={reduce ? { duration: 0 } : { duration: 0.5, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
    />
  )

  return (
    <div className="wf" role="table" aria-label="Revenue change broken into its drivers">
      {steps.map((s, i) => (
        <div className="wf-row" role="row" key={s.key}>
          <div className="wf-name" role="rowheader">
            {s.name}
            <small>{s.note}</small>
          </div>
          <div className="wf-track" style={{ height }} aria-hidden="true">
            <div className="wf-zero" style={{ left: `${x(0)}%` }} />
            {bar({ from: s.from, to: s.to, color: s.color, i })}
          </div>
          <div className="wf-val" role="cell">{signedMoney(s.v, 1)}</div>
        </div>
      ))}
      <div className="wf-row is-total" role="row">
        <div className="wf-name" role="rowheader">Total change</div>
        <div className="wf-track" style={{ height }} aria-hidden="true">
          <div className="wf-zero" style={{ left: `${x(0)}%` }} />
          {bar({ from: 0, to: total, cls: 'total', i: 4 })}
        </div>
        <div className="wf-val" role="cell">{signedMoney(total, 1)}</div>
      </div>
    </div>
  )
}
