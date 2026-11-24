import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine,
} from 'recharts'
import { num } from '../format'

const SERIES = [
  { key: 'revenue', name: 'Revenue', color: 'var(--c-price)' },
  { key: 'pax', name: 'Passengers', color: 'var(--c-vol)' },
]

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip">
      <div className="tip-title">Q{p.quarter} {p.year}</div>
      {SERIES.map((s) => (
        <div className="tip-row" key={s.key}>
          <span><i style={{ background: s.color }} />{s.name}</span>
          <span>{num(p[s.key], 0)}</span>
        </div>
      ))}
      {p.covid && <div className="tip-note">COVID-19 period</div>}
    </div>
  )
}

/** Revenue and passengers, each indexed to the same quarter of 2019 = 100, on one axis. */
export default function IndexChart({ data, year, qs }) {
  const rows = useMemo(
    () => data.quarters.map((q) => ({
      period: q.period, year: q.year, quarter: q.quarter, covid: q.covid_period,
      x: `Q${q.quarter} ’${String(q.year).slice(2)}`,
      revenue: q.chg.revenue_vs2019_pct == null ? null : 100 + Number(q.chg.revenue_vs2019_pct),
      pax: q.chg.pax_vs2019_pct == null ? null : 100 + Number(q.chg.pax_vs2019_pct),
    })),
    [data],
  )
  const first = `Q${qs[0]} ’${String(year).slice(2)}`
  const last = `Q${qs[qs.length - 1]} ’${String(year).slice(2)}`

  return (
    <div>
      <div className="legend" aria-hidden="true">
        {SERIES.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <ReferenceArea x1="Q1 ’20" x2="Q4 ’21" fill="var(--surface-2)" fillOpacity={1} ifOverflow="hidden"
              label={{ value: 'COVID', position: 'insideTop', fill: 'var(--muted)', fontSize: 12 }} />
            <ReferenceArea x1={first} x2={last} fill="var(--c-price)" fillOpacity={0.12} stroke="var(--c-price)" strokeOpacity={0.5} />
            <ReferenceLine y={100} stroke="var(--muted)" strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }}
              interval={3} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 'auto']} width={48} />
            <Tooltip content={<Tip />} cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2}
                dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
