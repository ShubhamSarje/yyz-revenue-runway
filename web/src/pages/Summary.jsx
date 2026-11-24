import CountUp from '../components/CountUp'
import Waterfall from '../components/Waterfall'
import IndexChart from '../components/IndexChart'
import { verdict } from '../verdict'
import { pct } from '../data'
import { money, millions, dollars, pctText, pp, num, signedMoney } from '../format'

const FINDINGS = [
  { id: 'F1', tab: 'bridge', title: 'Growth came from price, not volume',
    text: '2025 revenue was 37% above 2019 on 6.5% fewer passengers. Published fee increases explain 57% of the $564M gain.' },
  { id: 'F2', tab: 'traffic', title: 'The hub paradox',
    text: 'About 80% of 2026 passenger growth is connecting travellers, who pay a $10 improvement fee instead of $40.' },
  { id: 'F3', tab: 'traffic', title: 'US flying is down, but the risk is small',
    text: 'US movements are 15.7% below 2019. Revenue at risk is $5–16M a year, under 1% of revenue.' },
  { id: 'F4', tab: 'cost', title: 'Ground rent takes 12 cents of each new dollar',
    text: 'Federal ground rent rose $65M since 2019, 11.6% of the revenue increase.' },
  { id: 'F5', tab: 'unit', title: 'Shopping and parking barely grew in real terms',
    text: 'After inflation, commercial revenue per traveller is up only 5.8%; fees are up 21–42%.' },
  { id: 'F6', tab: 'unit', title: 'Airlines pay 46% more per passenger',
    text: 'Cost per enplaned passenger rose 46% since 2019, more than twice the 20.5% in announced rate increases.' },
  { id: 'F7', tab: 'cost', title: 'Margins did not move',
    text: 'EBITDA margin was 47.7% in 2019 and 47.5% in 2025: the extra revenue per traveller went into higher costs.' },
]

function Delta({ cur, base, kind = 'pct', label }) {
  if (base == null) return <p className="kpi-delta">No earlier year in this dataset</p>
  const v = kind === 'pp' ? cur - base : pct(cur, base)
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : ''
  return (
    <p className="kpi-delta">
      <span className={cls}>{kind === 'pp' ? pp(v) : pctText(v)}</span> {label}
    </p>
  )
}

export default function Summary({ data, sel, goTo }) {
  const { cur, base, bridge, label, baseLabel, comparison } = sel
  const total = bridge.find((b) => b.stream === 'total')
  const v = verdict(total)
  const vsText = comparison === 'vs 2019' ? `vs ${baseLabel}` : `vs ${baseLabel}`
  const revChg = base ? pct(cur.revenue_total, base.revenue_total) : null
  const paxChg = base ? pct(cur.pax_total, base.pax_total) : null

  return (
    <div className="stack" style={{ gap: 0 }}>
      <section className="hero" aria-live="polite">
        <div>
          <p className="verdict">
            Where did revenue growth come from in {label}{base ? `, ${vsText}` : ''}?
          </p>
          <h2 className="hero-answer">{v ? v.answer : 'Pick a comparison year to see the answer.'}</h2>
          {base ? (
            <p className="hero-lede">
              Toronto Pearson earned <b>{money(cur.revenue_total)}</b> in {label},{' '}
              <b>{pctText(revChg)}</b> {vsText}, while passengers changed by <b>{pctText(paxChg)}</b>.
              {total && Number(total.published_price_effect) !== 0 && (
                <> Published fee increases alone added <b>{signedMoney(Number(total.published_price_effect))}</b>.</>
              )}
              {v?.aside && <> {v.aside}</>}
            </p>
          ) : (
            <p className="hero-lede">2018 is the first year in this dashboard, so there is no prior year to compare with. Compare with 2019 instead.</p>
          )}
        </div>
        <div className="panel">
          <h2>{total ? `Where the ${signedMoney(Number(total.revenue_change))} came from` : 'Revenue bridge'}</h2>
          <p className="sub">
            {total
              ? `Change in total revenue, ${label} ${vsText}, split into its drivers (C$).`
              : 'No comparison available for this selection.'}
          </p>
          {total && !total.involves_covid && <Waterfall row={total} />}
          {total && total.involves_covid && (
            <p className="covid-note">
              Revenue changed by <b>{signedMoney(Number(total.revenue_change))}</b> while passengers changed by{' '}
              <b>{pctText(paxChg)}</b>. When traffic swings this hard, splitting the change into price and volume
              produces huge offsetting numbers that mean nothing, so the split is hidden for COVID-affected
              comparisons. Compare a 2023–2026 period with 2019 to see a clean answer.
            </p>
          )}
          {total && !total.involves_covid && (
            <button className="findings-link" onClick={() => goTo('bridge')} style={{ marginTop: 14, background: 'none', border: 0, padding: 0, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', fontSize: 14 }}>
              See the bridge by revenue stream
            </button>
          )}
        </div>
      </section>

      <section className="kpis" aria-label={`Key numbers for ${label}`}>
        <div className="kpi">
          <p className="kpi-label">Revenue</p>
          <p className="kpi-value"><CountUp value={cur.revenue_total} format={(x) => money(x)} /></p>
          <Delta cur={cur.revenue_total} base={base?.revenue_total} label={vsText} />
        </div>
        <div className="kpi">
          <p className="kpi-label">Passengers</p>
          <p className="kpi-value"><CountUp value={cur.pax_total} format={(x) => millions(x)} /></p>
          <Delta cur={cur.pax_total} base={base?.pax_total} label={vsText} />
        </div>
        <div className="kpi">
          <p className="kpi-label">Revenue per departing passenger</p>
          <p className="kpi-value"><CountUp value={cur.rev_per_enplaned} format={(x) => dollars(x)} /></p>
          <Delta cur={cur.rev_per_enplaned} base={base?.rev_per_enplaned} label={vsText} />
        </div>
        <div className="kpi">
          <p className="kpi-label">EBITDA margin</p>
          <p className="kpi-value"><CountUp value={cur.ebitda_margin} format={(x) => (x == null ? '–' : `${num(x, 1)}%`)} /></p>
          <Delta cur={cur.ebitda_margin} base={base?.ebitda_margin} kind="pp" label={vsText} />
        </div>
      </section>

      <section className="panel">
        <h2>Revenue recovered past 2019. Passengers did not.</h2>
        <p className="sub">Each quarter indexed to the same quarter of 2019 (2019 = 100). Your selection is highlighted.</p>
        <IndexChart data={data} year={sel.year} qs={sel.qs} />
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="section-title">What the 35 quarters show</h2>
        <p className="section-sub">Seven findings from the SQL analysis, each traced to a GTAA report page in FINDINGS.md.</p>
        <ol className="findings">
          {FINDINGS.map((f) => (
            <li key={f.id}>
              <span className="fid">{f.id}</span>
              <div>
                <p><b>{f.title}</b>{f.text}</p>
                <button className="link" onClick={() => goTo(f.tab)}>Explore</button>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
