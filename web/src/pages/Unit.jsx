import { useMemo, useState } from 'react'
import { Lines, qLabel } from '../components/Charts'
import { highlightOf, pct, rolling, sum, years } from '../data'
import { dollars, num, pctText } from '../format'

const LINES = [
  { id: 'aero', name: 'Aeronautical fees', rev: 'aero_revenue', blurb: 'Landing and terminal fees, per departing passenger' },
  { id: 'aif', name: 'Improvement fee', rev: 'aif_revenue', blurb: 'Airport improvement fee, per departing passenger' },
  { id: 'commercial', name: 'Commercial', rev: 'commercial_revenue', blurb: 'Parking, retail, food and rentals, per departing passenger' },
]

function perPax(a, field, real) {
  if (!a) return null
  if (!real) return a[field] / a.enplaned_pax
  return a.rows.reduce((s, r) => s + r[field] / r.deflator_2019, 0) / a.enplaned_pax
}

export default function Unit({ data, sel }) {
  const [real, setReal] = useState(true)
  const { cur, base, label, baseLabel } = sel

  const rowsFor = useMemo(() => {
    const out = {}
    for (const l of LINES) {
      const vals = rolling(data, (w) => (w.some((r) => r.covid_period) ? null
        : sum(w, (r) => r[l.rev] / (real ? r.deflator_2019 : 1)) / sum(w, 'enplaned_pax')))
      out[l.id] = data.quarters.map((q, i) => ({ x: qLabel(q.year, q.quarter), v: vals[i] }))
    }
    return out
  }, [data, real])
  const ref19 = (id) => rowsFor[id].find((r) => r.x === 'Q4 ’19')?.v

  const idx = useMemo(() => {
    const ys = years(data)
    const b = ys.find((a) => a.year === 2019)
    const avg = (a, f) => a.rows.reduce((s, r) => s + Number(r[f]), 0) / a.rows.length
    const cpe0 = b.aero_revenue / b.enplaned_pax
    return ys.filter((a) => a.year === 2019 || a.year >= 2022).map((a) => ({
      x: a.quarters.length === 4 ? String(a.year) : `${a.year} (9M)`,
      cpe: (100 * (a.aero_revenue / a.enplaned_pax)) / cpe0,
      rate: (100 * avg(a, 'aero_rate_index')) / avg(b, 'aero_rate_index'),
      cpi: (100 * avg(a, 'cpi_ontario')) / avg(b, 'cpi_ontario'),
    }))
  }, [data])
  const last25 = idx.find((r) => r.x === '2025')

  const tableRows = [
    ...LINES.map((l) => ({ name: l.name, f: l.rev })),
    { name: 'Total revenue', f: 'revenue_total', total: true },
    { name: 'Operating cost', f: 'opex_before_amort', cost: true },
  ]

  return (
    <>

      <section id="t-real" className="panel">
        <div className="row-head">
          <div>
            <h2>Per departing passenger: {label}{baseLabel ? ` vs ${baseLabel}` : ''}</h2>
            <p className="sub" style={{ margin: 0 }}>
              {real ? 'In 2019 dollars (Ontario CPI), so the change is real, not inflation.' : 'In dollars of the day.'} Departing passengers are half of all passengers.
            </p>
          </div>
          <div className="seg" role="group" aria-label="Dollars">
            <button aria-pressed={real} onClick={() => setReal(true)}>2019 dollars</button>
            <button aria-pressed={!real} onClick={() => setReal(false)}>Dollars of the day</button>
          </div>
        </div>
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Per departing passenger</th>{base && <th>{baseLabel}</th>}<th>{label}</th>{base && <th>Change</th>}</tr></thead>
            <tbody>
              {tableRows.map((r) => {
                const c = perPax(cur, r.f, real)
                const b = perPax(base, r.f, real)
                const ch = pct(c, b)
                const good = r.cost ? ch < 0 : ch > 0
                return (
                  <tr key={r.name} className={r.total ? 'total' : ''}>
                    <td>{r.name}</td>
                    {base && <td>{dollars(b)}</td>}
                    <td>{dollars(c)}</td>
                    {base && <td className={ch == null ? '' : good ? 'up' : 'down'}>{pctText(ch)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="callout">
          Fees did the work. After inflation, commercial revenue per traveller (shopping, food, parking) is up only
          about 6% on 2019, while aeronautical fees are up about 22% and the improvement fee about 42%.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="section-title">Trailing twelve months, per departing passenger</h2>
        <p className="section-sub">Rolling four-quarter totals smooth out the seasons; windows that include COVID quarters are left out. Dashed line: the 2019 level. {real ? '2019 dollars.' : 'Dollars of the day.'}</p>
        <div className="multiples">
          {LINES.map((l) => (
            <div className="panel multiple" key={l.id}>
              <h3>{l.name}</h3>
              <p>{l.blurb}</p>
              <Lines rows={rowsFor[l.id]} series={[{ key: 'v', name: l.name, color: 'var(--ink)' }]}
                fmt={(v) => dollars(v)} yFmt={(v) => `$${num(v, 0)}`} height={190} refY={ref19(l.id)}
                highlight={highlightOf(sel)} interval={11} covid />
            </div>
          ))}
        </div>
      </section>

      <section id="t-cpe" className="panel" style={{ marginTop: 'var(--gap)' }}>
        <h2>Airlines pay 46% more per passenger. Announced rates rose 20%.</h2>
        <p className="sub">
          Index, 2019 = 100; 2020–21 left out (COVID). Airline cost per passenger is aeronautical revenue per departing passenger (it matches the
          GTAA’s published figure within 10 cents). The rate index compounds the GTAA’s announced annual increases.
        </p>
        <Lines
          rows={idx}
          series={[
            { key: 'cpe', name: 'Airline cost per passenger', color: 'var(--c-price)' },
            { key: 'rate', name: 'Announced rate increases', color: 'var(--ink)', dash: true },
            { key: 'cpi', name: 'Ontario inflation (CPI)', color: 'var(--muted)' },
          ]}
          fmt={(v) => num(v, 1)} yFmt={(v) => num(v, 0)} refY={100} covid={false} interval={0} height={260}
        />
        {last25 && (
          <p className="callout">
            By 2025 the airline cost per passenger index reached <b>{num(last25.cpe, 0)}</b>, against <b>{num(last25.rate, 0)}</b> for
            announced rates and <b>{num(last25.cpi, 0)}</b> for inflation. Revenue per tonne of aircraft weight rose just as fast,
            so bigger planes don’t explain the gap; it sits in charges outside the headline rate, such as apron and de-icing fees.
            Since 2023, the cost per passenger has fallen after inflation.
          </p>
        )}
      </section>
    </>
  )
}
