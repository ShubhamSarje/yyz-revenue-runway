import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine,
} from 'recharts'

export const qLabel = (year, quarter) => `Q${quarter} ’${String(year).slice(2)}`
const tick = { fill: 'var(--muted)', fontSize: 12 }

function Tip({ active, payload, label, series, fmt, title }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip">
      <div className="tip-title">{title ? title(p) : label}</div>
      {series.map((s) => (
        <div className="tip-row" key={s.key}>
          <span><i style={{ background: s.color }} />{s.name}</span>
          <span>{p[s.key] == null ? '–' : (s.fmt || fmt)(p[s.key])}</span>
        </div>
      ))}
      {p.note && <div className="tip-note">{p.note}</div>}
    </div>
  )
}

export function Legend({ series }) {
  return (
    <div className="legend" aria-hidden="true">
      {series.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.dash ? `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 8px)` : s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

/**
 * Multi-series line chart over a categorical x axis (quarters or years).
 * series: [{ key, name, color, dash?, fmt? }]. Single y axis only.
 */
export function Lines({
  rows, series, xKey = 'x', fmt = (v) => v, height = 280, yDomain = ['auto', 'auto'], refY, highlight,
  covid = true, title, interval = 3, yFmt,
}) {
  return (
    <div>
      {series.length > 1 && <Legend series={series} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            {covid && (
              <ReferenceArea x1="Q1 ’20" x2="Q4 ’21" fill="var(--surface-2)" fillOpacity={1} ifOverflow="hidden"
                label={{ value: 'COVID', position: 'insideTop', fill: 'var(--muted)', fontSize: 12 }} />
            )}
            {highlight && (
              <ReferenceArea x1={highlight[0]} x2={highlight[1]} fill="var(--c-price)" fillOpacity={0.12}
                stroke="var(--c-price)" strokeOpacity={0.5} ifOverflow="hidden" />
            )}
            {refY != null && <ReferenceLine y={refY} stroke="var(--muted)" strokeDasharray="3 3" />}
            <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={{ stroke: 'var(--line)' }}
              interval={interval === 0 ? 0 : 'preserveStartEnd'} minTickGap={34} />
            <YAxis tick={tick} tickLine={false} axisLine={false} domain={yDomain} width={56} tickFormatter={yFmt || fmt} />
            <Tooltip content={<Tip series={series} fmt={fmt} title={title} />} cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }} />
            {series.map((s) => (
              <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2}
                strokeDasharray={s.dash ? '6 4' : undefined} dot={false} connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Single-series bar chart; the highlighted bar is solid, the rest recede. */
export function Bars({ rows, xKey = 'x', yKey = 'y', color = 'var(--ink)', fmt = (v) => v, height = 200, isHi, name, yDomain = [0, 'auto'], interval = 0 }) {
  const series = [{ key: yKey, name, color }]
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="22%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={interval} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={52} tickFormatter={fmt} domain={yDomain} />
          <Tooltip content={<Tip series={series} fmt={fmt} />} cursor={{ fill: 'var(--surface-2)' }} />
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {rows.map((r, i) => (
              <Cell key={i} fill={color} fillOpacity={isHi ? (isHi(r) ? 1 : 0.38) : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
