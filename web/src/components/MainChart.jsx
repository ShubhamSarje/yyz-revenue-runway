import { useMemo } from 'react'
import { Lines, qLabel } from './Charts'
import { highlightOf } from '../data'
import { num, money, dollars } from '../format'

const SRC = { revenue: 'revenue_total', pax: 'pax_total', revpax: 'revenue_total', margin: 'ebitda', flights: 'movements', lf: 'load_factor' }

const METRICS = {
  index: { title: 'Revenue recovered past 2019. Passengers did not.', sub: 'Each quarter indexed to the same quarter of 2019 (2019 = 100). Click a number on the board above to chart it instead.' },
  revenue: { title: 'Revenue by quarter', sub: 'C$ millions. Dashed: the same quarter of 2019.', v: (q) => q.revenue_total, fmt: (x) => money(x), yFmt: (x) => `$${num(x, 0)}M` },
  pax: { title: 'Passengers by quarter', sub: 'Millions. Dashed: the same quarter of 2019.', v: (q) => q.pax_total, fmt: (x) => `${num(x, 1)}M`, yFmt: (x) => `${num(x, 0)}M` },
  revpax: { title: 'Revenue per departing passenger', sub: 'Dollars of the day. Dashed: the same quarter of 2019.', v: (q) => q.revenue_total / q.enplaned_pax, fmt: (x) => dollars(x), yFmt: (x) => `$${num(x, 0)}`, covidNull: true },
  margin: { title: 'EBITDA margin by quarter', sub: 'Percent of revenue. Dashed: the same quarter of 2019.', v: (q) => (100 * q.ebitda) / q.revenue_total, fmt: (x) => `${num(x, 1)}%`, yFmt: (x) => `${num(x, 0)}%`, covidNull: true },
  flights: { title: 'Flights by quarter', sub: 'Thousands of takeoffs and landings. Dashed: the same quarter of 2019.', v: (q) => q.movements, fmt: (x) => `${num(x, 1)}K`, yFmt: (x) => `${num(x, 0)}K` },
  lf: { title: 'Seats filled by quarter', sub: 'Load factor reported by the GTAA. Dashed: the same quarter of 2019.', v: (q) => q.load_factor, fmt: (x) => `${num(x, 1)}%`, yFmt: (x) => `${num(x, 0)}%` },
}

export default function MainChart({ data, sel, metric, onMetric }) {
  const m = METRICS[metric] || METRICS.index
  const rows = useMemo(() => data.quarters.map((q) => {
    const base = { x: qLabel(q.year, q.quarter), note: q.covid_period ? 'COVID-19 period' : undefined }
    if (metric === 'index' || !METRICS[metric]) {
      return {
        ...base,
        revenue: q.chg.revenue_vs2019_pct == null ? null : 100 + Number(q.chg.revenue_vs2019_pct),
        pax: q.chg.pax_vs2019_pct == null ? null : 100 + Number(q.chg.pax_vs2019_pct),
        src: data.sources?.[q.period]?.revenue_total,
      }
    }
    const ref = data.byPeriod[`2019Q${q.quarter}`]
    const val = m.covidNull && q.covid_period ? null : m.v(q)
    return { ...base, v: val, ref: ref ? m.v(ref) : null, src: data.sources?.[q.period]?.[SRC[metric]] }
  }), [data, metric, m])

  const series = metric === 'index' || !METRICS[metric]
    ? [{ key: 'revenue', name: 'Revenue', color: 'var(--c-price)' }, { key: 'pax', name: 'Passengers', color: 'var(--c-vol)' }]
    : [{ key: 'v', name: m.title.replace(' by quarter', ''), color: 'var(--c-vol)', fmt: m.fmt }, { key: 'ref', name: 'Same quarter, 2019', color: 'var(--muted)', dash: true, fmt: m.fmt }]

  return (
    <div className="panel">
      <div className="row-head">
        <div>
          <h2>{m.title}</h2>
          <p className="sub" style={{ margin: 0 }}>{m.sub}</p>
        </div>
        {metric !== 'index' && <button className="chip-btn" onClick={() => onMetric('index')}>Back to revenue vs passengers</button>}
      </div>
      <Lines
        rows={rows} series={series} animKey={metric} height={320}
        fmt={metric === 'index' ? (v) => num(v, 0) : m.fmt} yFmt={metric === 'index' ? (v) => num(v, 0) : m.yFmt}
        refY={metric === 'index' ? 100 : undefined} yDomain={metric === 'index' ? [0, 'auto'] : ['auto', 'auto']}
        highlight={highlightOf(sel)}
      />
    </div>
  )
}
