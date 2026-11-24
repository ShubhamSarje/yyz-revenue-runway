import { useMemo } from 'react'
import PhotoBand from '../components/PhotoBand'
import Kpi from '../components/Kpi'
import { Lines, qLabel } from '../components/Charts'
import { money, num, dollars } from '../format'

const ratio = (q) => (q && q.ttm.ttm_complete ? Number(q.total_debt) / Number(q.ttm.ebitda_ttm) : null)

export default function Credit({ data, sel }) {
  const lastQ = sel.qs[sel.qs.length - 1]
  const q = data.byPeriod[`${sel.year}Q${lastQ}`]
  const b = sel.base ? data.byPeriod[`${sel.baseYear}Q${lastQ}`] : null
  const at = `Q${lastQ} ${sel.year}`
  const vs = b ? `vs Q${lastQ} ${sel.baseYear}` : ''

  const rows = useMemo(() => data.quarters.map((r) => {
    const ok = r.ttm.ttm_complete && !r.ttm.window_includes_covid
    return {
      x: qLabel(r.year, r.quarter),
      reported: ok ? Number(r.ttm.debt_per_epax_reported) : null,
      calc: ok ? Number(r.ttm.debt_per_epax_calculated) : null,
      lev: ok ? ratio(r) : null,
    }
  }), [data])
  const covenants = data.quarters.filter((r) => r.operating_covenant != null && r.quarter === 4)

  return (
    <>
      <PhotoBand photo="dusk777" size="slim">
        <h2>Credit health</h2>
        <p>Debt, leverage and the covenant tests in the GTAA’s bond indenture. Balance-sheet values are at the end of {at}.</p>
      </PhotoBand>

      <section className="kpis" aria-label={`Credit metrics at ${at}`}>
        <Kpi label="Total debt" cur={Number(q.total_debt)} base={b ? Number(b.total_debt) : null} format={(x) => money(x)} vs={vs} invert />
        <Kpi label="Net debt (after cash)" cur={Number(q.net_debt)} base={b ? Number(b.net_debt) : null} format={(x) => money(x)} vs={vs} invert />
        <Kpi label="Debt per departing passenger" cur={Number(q.debt_per_epax)} base={b ? Number(b.debt_per_epax) : null} format={(x) => dollars(x, 0)} vs={vs} invert />
        <Kpi label="Debt / EBITDA (trailing 12 months)" cur={ratio(q)} base={ratio(b)} format={(x) => (x == null ? '–' : `${num(x, 1)}×`)} vs={vs} invert />
      </section>

      <section className="panel">
        <h2>Debt per departing passenger, rebuilt in SQL</h2>
        <p className="sub">
          The GTAA reports total debt divided by trailing-twelve-month departing passengers. The dashed line is our own
          calculation from the SQL view <code>v_ttm</code>; outside COVID it matches within $1. COVID windows are left out
          because passengers fell so far that the ratio spiked above $1,500.
        </p>
        <Lines
          rows={rows}
          series={[
            { key: 'reported', name: 'Reported by the GTAA', color: 'var(--c-vol)' },
            { key: 'calc', name: 'Calculated in SQL', color: 'var(--ink)', dash: true },
          ]}
          fmt={(v) => dollars(v, 0)} yDomain={[200, 400]} highlight={[qLabel(sel.year, lastQ), qLabel(sel.year, lastQ)]}
        />
      </section>

      <div className="grid-2" style={{ marginTop: 'var(--gap)' }}>
        <section className="panel">
          <h2>Leverage is back below 2019</h2>
          <p className="sub">Total debt ÷ trailing-twelve-month EBITDA. Lower is safer.</p>
          <Lines rows={rows} series={[{ key: 'lev', name: 'Debt / EBITDA', color: 'var(--ink)' }]}
            fmt={(v) => `${num(v, 1)}×`} yDomain={[5, 10]} height={220} highlight={[qLabel(sel.year, lastQ), qLabel(sel.year, lastQ)]} interval={7} />
        </section>

        <section className="panel">
          <h2>Covenant tests, year end</h2>
          <p className="sub">The GTAA’s Master Trust Indenture sets two minimum tests. Higher means more headroom.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Year</th><th>Operating covenant<br />(min 100%)</th><th>Debt service covenant<br />(min 125%)</th></tr></thead>
              <tbody>
                {covenants.map((r) => (
                  <tr key={r.period}>
                    <td>{r.year}</td>
                    <td>{num(Number(r.operating_covenant), 1)}%</td>
                    <td>{num(Number(r.debt_service_covenant), 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">The GTAA does not publish these tests in every report; 2020–2022 year-end values were not in the filings used.</p>
        </section>
      </div>
    </>
  )
}
