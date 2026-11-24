import { useMemo } from 'react'
import Kpi from '../components/Kpi'
import { Lines, qLabel } from '../components/Charts'
import { highlightOf, pct } from '../data'
import { money, num, pctText, dollars, signedMoney } from '../format'

const COSTS = [
  { f: 'salaries', name: 'Salaries and benefits' },
  { f: 'goods_services', name: 'Goods and services' },
  { f: 'ground_rent', name: 'Ground rent (federal)' },
  { f: 'pilt', name: 'Payments in lieu of property tax' },
]

export default function Cost({ data, sel }) {
  const { cur, base, label, baseLabel } = sel
  const vs = baseLabel ? `vs ${baseLabel}` : ''

  const ttm = useMemo(() => data.quarters.map((q) => ({
    x: qLabel(q.year, q.quarter),
    margin: q.ttm.ttm_complete && !q.ttm.window_includes_covid ? Number(q.ttm.ebitda_margin_ttm_pct) : null,
    rent: q.ttm.ttm_complete && !q.ttm.window_includes_covid ? Number(q.ttm.ground_rent_share_ttm_pct) : null,
  })), [data])

  const revChange = base ? cur.revenue_total - base.revenue_total : null
  const rentChange = base ? cur.ground_rent - base.ground_rent : null
  const rentShareOfChange = revChange > 0 ? (100 * rentChange) / revChange : null

  return (
    <>

      <section className="glass kpis" aria-label={`Costs for ${label}`}>
        <Kpi label="Operating costs" cur={cur.opex_before_amort} base={base?.opex_before_amort} format={(x) => money(x)} vs={vs} invert />
        <Kpi label="EBITDA" cur={cur.ebitda} base={base?.ebitda} format={(x) => money(x)} vs={vs} />
        <Kpi label="EBITDA margin" cur={cur.ebitda_margin} base={base?.ebitda_margin} kind="pp" format={(x) => (x == null ? '–' : `${num(x, 1)}%`)} vs={vs} />
        <Kpi label="Ground rent, share of revenue" cur={cur.ground_rent_share} base={base?.ground_rent_share} kind="pp" invert format={(x) => (x == null ? '–' : `${num(x, 1)}%`)} vs={vs} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Operating costs by type</h2>
          <p className="sub">C$ millions and per departing passenger, before depreciation and interest.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Cost</th>{base && <th>{baseLabel}</th>}<th>{label}</th>{base && <th>Change</th>}</tr>
              </thead>
              <tbody>
                {[...COSTS, { f: 'opex_before_amort', name: 'Total operating costs', total: true }].map((c) => {
                  const ch = base ? pct(cur[c.f], base[c.f]) : null
                  return (
                    <tr key={c.f} className={c.total ? 'total' : ''}>
                      <td>{c.name}</td>
                      {base && <td>{num(base[c.f], 1)}</td>}
                      <td>{num(cur[c.f], 1)}</td>
                      {base && <td>{pctText(ch)}</td>}
                    </tr>
                  )
                })}
                <tr>
                  <td>Per departing passenger</td>
                  {base && <td>{dollars(base.opex_per_enplaned)}</td>}
                  <td>{dollars(cur.opex_per_enplaned)}</td>
                  {base && <td>{pctText(pct(cur.opex_per_enplaned, base.opex_per_enplaned))}</td>}
                </tr>
              </tbody>
            </table>
          </div>
          {cur.rent_relief && <p className="note">Q4 2020 includes a one-off federal ground rent credit, so ground rent is negative that quarter.</p>}
        </section>

        <section id="t-rent" className="panel">
          <h2>Twelve cents of each new dollar goes to ground rent</h2>
          <p className="sub">Ground rent is a sliding share of airport revenue, with a top rate of 12% above $250M.</p>
          <Lines rows={ttm} series={[{ key: 'rent', name: 'Ground rent, % of revenue (trailing 12 months)', color: 'var(--ink)' }]}
            fmt={(v) => `${num(v, 1)}%`} yFmt={(v) => `${num(v, 0)}%`} yDomain={[8, 13]} height={200} highlight={highlightOf(sel)} interval={7} />
          {rentShareOfChange != null && !cur.covid && !base.covid ? (
            <p className="callout">
              Revenue changed by <b>{signedMoney(revChange)}</b> from {baseLabel} to {label}; ground rent took{' '}
              <b>{signedMoney(rentChange)}</b> of it, or <b>{num(rentShareOfChange, 1)}%</b>, before any operating cost.
            </p>
          ) : (
            <p className="note">Pick a period after 2022 with a growing comparison to see how much of the increase went to ground rent. COVID-era rent relief makes 2020–21 comparisons misleading.</p>
          )}
        </section>
      </div>

      <section id="t-margin" className="panel" style={{ marginTop: 'var(--gap)' }}>
        <h2>Margins did not move</h2>
        <p className="sub">EBITDA margin, trailing twelve months. Windows that include COVID quarters are left out. Dashed line: 2019.</p>
        <Lines rows={ttm} series={[{ key: 'margin', name: 'EBITDA margin', color: 'var(--ink)' }]}
          fmt={(v) => `${num(v, 1)}%`} yFmt={(v) => `${num(v, 0)}%`} yDomain={[40, 55]} refY={47.7} highlight={highlightOf(sel)} />
        <p className="callout">
          The margin was <b>47.7%</b> in 2019 and <b>47.5%</b> in 2025. Operating cost per traveller rose about 22% after
          inflation, matching the rise in revenue per traveller: the extra revenue paid for higher costs, not a wider margin.
        </p>
      </section>
    </>
  )
}
