import { useMemo } from 'react'
import Kpi from '../components/Kpi'
import { Lines, Bars, qLabel } from '../components/Charts'
import { aggregate, highlightOf, pct, years } from '../data'
import { millions, num, pctText, money } from '../format'

export default function Traffic({ data, sel }) {
  const { cur, base, baseLabel, label } = sel
  const vs = baseLabel ? `vs ${baseLabel}` : ''

  const idx = useMemo(() => data.quarters.map((q) => ({
    x: qLabel(q.year, q.quarter),
    pax: q.chg.pax_vs2019_pct == null ? null : 100 + Number(q.chg.pax_vs2019_pct),
    seats: q.chg.seats_vs2019_pct == null ? null : 100 + Number(q.chg.seats_vs2019_pct),
    flights: q.chg.movements_vs2019_pct == null ? null : 100 + Number(q.chg.movements_vs2019_pct),
  })), [data])

  const share = useMemo(() => data.quarters.map((q) => ({
    x: qLabel(q.year, q.quarter),
    us: q.statcan_complete_quarter ? Number(q.transborder_share_pct) : null,
  })), [data])

  // Hub paradox: reported O&D vs connecting passengers (GTAA MD&A tables)
  const mix = data.passenger_mix.filter((m) => m.period_type !== 'Q')
  const m25 = mix.find((m) => m.period_label === '9M 2025')
  const m26 = mix.find((m) => m.period_label === '9M 2026')
  const nine26 = aggregate(data, 2026, [1, 2, 3])
  const connGrowth = pct(m26.connecting_pax_m, m25.connecting_pax_m)
  const odGrowth = pct(m26.od_pax_m, m25.od_pax_m)
  const connShareOfGrowth = (100 * (m26.connecting_pax_m - m25.connecting_pax_m)) / (m26.total_pax_m - m25.total_pax_m)
  const rate26 = data.fee_rates.find((f) => f.effective_date === '2026-01-01')
  const forgone = nine26.enplaned_pax * ((m26.connecting_share_pct - m25.connecting_share_pct) / 100) * (rate26.aif_local - rate26.aif_connecting)

  // US (transborder) flights, complete StatCan years only
  const yrs = years(data)
  const y19 = yrs.find((a) => a.year === 2019)
  const y25 = yrs.find((a) => a.year === 2025)
  const usVs19 = pct(y25.transborder_movements, y19.transborder_movements)

  return (
    <>

      <section className="glass kpis k3" aria-label={`Capacity for ${label}`}>
        <Kpi label="Seats" cur={cur.seats} base={base?.seats} format={(x) => millions(x)} vs={vs} />
        <Kpi label="Passengers per flight" cur={cur.pax_per_movement} base={base?.pax_per_movement} format={(x) => num(x, 0)} vs={vs} />
        <Kpi label="International passengers" cur={cur.pax_international} base={base?.pax_international} format={(x) => millions(x)} vs={vs} />
      </section>

      <section className="panel">
        <h2>Fewer, fuller, bigger flights</h2>
        <p className="sub">Each quarter indexed to the same quarter of 2019 (2019 = 100). Passengers came back faster than flights: airlines fly larger aircraft with more seats filled.</p>
        <Lines
          rows={idx}
          series={[
            { key: 'pax', name: 'Passengers', color: 'var(--c-vol)' },
            { key: 'seats', name: 'Seats', color: 'var(--ink)' },
            { key: 'flights', name: 'Flights', color: 'var(--ink)', dash: true },
          ]}
          fmt={(v) => num(v, 0)} refY={100} yDomain={[0, 'auto']} highlight={highlightOf(sel)}
        />
      </section>

      <div className="grid-2" style={{ marginTop: 'var(--gap)' }}>
        <section id="t-hub" className="panel">
          <h2>The hub paradox</h2>
          <p className="sub">Share of passengers who were connecting between flights, as reported by the GTAA.</p>
          <Bars
            rows={mix.map((m) => ({ x: m.period_label.replace(/^9M (\d\d)(\d\d)$/, '9M ’$2'), y: Number(m.connecting_share_pct), label: m.period_label }))}
            name="Connecting share" color="var(--c-vol)" fmt={(v) => `${num(v, 0)}%`} height={210}
            isHi={(r) => r.label === '9M 2026'} yDomain={[0, 30]}
          />
          <p className="callout">
            In the first nine months of 2026, connecting passengers grew <b>{pctText(connGrowth)}</b> while local
            passengers grew <b>{pctText(odGrowth)}</b>, so about <b>{num(connShareOfGrowth, 0)}%</b> of the growth was
            connecting. A connecting passenger pays a ${rate26.aif_connecting} improvement fee instead of ${rate26.aif_local},
            so the mix shift cost roughly <b>{money(forgone)}</b> in fee revenue over those nine months.
          </p>
        </section>

        <section id="t-us" className="panel">
          <h2>US flying is down, but the risk is small</h2>
          <p className="sub">US (transborder) share of Pearson’s takeoffs and landings, Statistics Canada. Partial quarters are left out.</p>
          <Lines
            rows={share} series={[{ key: 'us', name: 'US share of flights', color: 'var(--c-vol)' }]}
            fmt={(v) => `${num(v, 1)}%`} yFmt={(v) => `${num(v, 0)}%`} height={210} highlight={highlightOf(sel)} interval={7}
          />
          <p className="callout">
            US flights were <b>{pctText(usVs19)}</b> below 2019 in 2025 ({num(y25.transborder_movements, 0)} vs{' '}
            {num(y19.transborder_movements, 0)}). US routes use smaller aircraft, so the 2025 decline puts only about{' '}
            <b>$5–16M a year</b> of revenue at risk, under 1%. Domestic and international growth more than offset it.
          </p>
          {!cur.statcan_complete && (
            <p className="note">Statistics Canada has not yet published September 2026, so US flight changes for {label} are not shown.</p>
          )}
        </section>
      </div>
    </>
  )
}
