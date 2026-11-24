import Flaps from './Flaps'
import { pct } from '../data'
import { money, millions, dollars, num, pctText, pp } from '../format'

export const TILES = [
  { id: 'revenue', label: 'Revenue', v: (a) => a.revenue_total, fmt: (x) => money(x, x >= 1000 ? 2 : 1), src: 'revenue_total' },
  { id: 'pax', label: 'Passengers', v: (a) => a.pax_total, fmt: (x) => millions(x), src: 'pax_total' },
  { id: 'revpax', label: 'Revenue per passenger', v: (a) => a.rev_per_enplaned, fmt: (x) => dollars(x), src: 'revenue_total' },
  { id: 'margin', label: 'EBITDA margin', v: (a) => a.ebitda_margin, fmt: (x) => `${num(x, 1)}%`, kind: 'pp', src: 'ebitda' },
  { id: 'flights', label: 'Flights', v: (a) => a.movements, fmt: (x) => `${num(x, 1)}K`, src: 'movements' },
  { id: 'lf', label: 'Seats filled', v: (a) => a.load_factor, fmt: (x) => `${num(x, 1)}%`, kind: 'pp', src: 'seats' },
]

/** The split-flap KPI board. Every value flips when the selection changes; clicking a tile swaps the main chart. */
export default function Board({ data, sel, metric, onMetric }) {
  const { cur, base, baseLabel, year, qs } = sel
  const lastQ = qs[qs.length - 1]
  const srcFor = (key) => {
    const s = data.sources?.[`${year}Q${lastQ}`]?.[key]
    if (!s) return undefined
    return qs.length > 1 ? `Sum of ${qs.length} quarters from GTAA reports. Latest quarter: ${s}` : `Source: ${s}`
  }
  return (
    <div className="board-glass board" role="group" aria-label="Key numbers. Click one to chart it.">
      {TILES.map((t, i) => {
        const c = t.v(cur)
        const b = base ? t.v(base) : null
        const d = b == null ? null : t.kind === 'pp' ? c - b : pct(c, b)
        return (
          <button key={t.id} className="tile" aria-pressed={metric === t.id} title={srcFor(t.src)}
            onClick={() => onMetric(metric === t.id ? 'index' : t.id)}>
            <p className="tile-label">{t.label}</p>
            <Flaps text={t.fmt(c)} delay={i * 60} />
            <p className="tile-delta">
              {d == null ? 'No comparison' : `${t.kind === 'pp' ? pp(d) : pctText(d)} vs ${baseLabel}`}
            </p>
          </button>
        )
      })}
    </div>
  )
}
