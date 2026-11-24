import { useState } from 'react'
import PhotoBand from '../components/PhotoBand'
import Waterfall, { EFFECTS } from '../components/Waterfall'
import { Bars } from '../components/Charts'
import { years } from '../data'
import { money, signedMoney, signedNum, num } from '../format'

const STREAMS = [
  { id: 'total', name: 'Total revenue', short: 'Total' },
  { id: 'aeronautical', name: 'Aeronautical fees', short: 'Aeronautical', key: 'aero_revenue', blurb: 'Landing and terminal fees paid by airlines' },
  { id: 'commercial', name: 'Commercial', short: 'Commercial', key: 'commercial_revenue', blurb: 'Parking, retail, food, rentals and other' },
  { id: 'aif', name: 'Airport improvement fee', short: 'Improvement fee', key: 'aif_revenue', blurb: 'Per-passenger fee collected through ticket prices' },
]

export default function Bridge({ data, sel }) {
  const [stream, setStream] = useState('total')
  const { bridge, label, baseLabel } = sel
  const row = bridge.find((b) => b.stream === stream)
  const covid = row?.involves_covid
  const s = STREAMS.find((x) => x.id === stream)
  const yrs = years(data)
  const priceShare = row && !covid && Number(row.revenue_change) > 0
    ? (100 * Number(row.published_price_effect)) / Number(row.revenue_change) : null

  return (
    <>
      <PhotoBand photo="dusk777" size="slim">
        <h2>Revenue bridge</h2>
        <p>How much of the change came from traveller numbers, and how much from charging more per traveller.</p>
      </PhotoBand>

      {!row ? (
        <p className="page-intro">There is no comparison period for this selection. Compare {sel.year} with 2019 instead.</p>
      ) : (
        <>
          <section className="panel">
            <div className="row-head">
              <div>
                <h2>{s.name}: {label} vs {baseLabel}</h2>
                <p className="sub" style={{ margin: 0 }}>
                  {money(Number(row.revenue_base))} → {money(Number(row.revenue_current))}, a change of{' '}
                  {signedMoney(Number(row.revenue_change))}.
                </p>
              </div>
              <div className="seg" role="group" aria-label="Revenue stream">
                {STREAMS.map((x) => (
                  <button key={x.id} aria-pressed={x.id === stream} onClick={() => setStream(x.id)}>{x.short}</button>
                ))}
              </div>
            </div>
            {covid ? (
              <p className="covid-note" style={{ marginTop: 12 }}>
                This comparison involves a COVID-affected period. With traffic down as much as 96%, splitting the change
                into price and volume produces huge offsetting numbers that mean nothing, so only the totals are shown.
              </p>
            ) : (
              <div style={{ marginTop: 16 }}><Waterfall row={row} height={30} /></div>
            )}
            {priceShare != null && stream !== 'commercial' && (
              <p className="callout">
                Published fee increases explain <b>{num(priceShare, 0)}%</b> of this change.
                {Number(row.volume_effect) < 0 && <> Traveller numbers pulled revenue <b>down</b> by {money(Math.abs(Number(row.volume_effect)))}.</>}
              </p>
            )}
          </section>

          <section className="panel" style={{ marginTop: 'var(--gap)' }}>
            <h2>Every stream, side by side</h2>
            <p className="sub">C$ millions, {label} vs {baseLabel}. Effects add up to the change in each row.</p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Stream</th><th>{baseLabel}</th><th>{label}</th><th>Change</th>
                    {!covid && EFFECTS.map((e) => <th key={e.key}><span className="swatch" style={{ background: e.color }} />{e.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['aeronautical', 'commercial', 'aif', 'total'].map((id) => {
                    const r = bridge.find((b) => b.stream === id)
                    if (!r) return null
                    return (
                      <tr key={id} className={id === 'total' ? 'total' : ''}>
                        <td>{STREAMS.find((x) => x.id === id).name}</td>
                        <td>{num(Number(r.revenue_base), 1)}</td>
                        <td>{num(Number(r.revenue_current), 1)}</td>
                        <td className={Number(r.revenue_change) >= 0 ? 'up' : 'down'}>{signedNum(Number(r.revenue_change))}</td>
                        {!covid && EFFECTS.map((e) => <td key={e.key}>{signedNum(Number(r[e.key]))}</td>)}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              Commercial revenue has no published price list, so its per-traveller change shows up entirely under “other per-traveller gains”.
            </p>
          </section>
        </>
      )}

      <section style={{ marginTop: 36 }}>
        <h2 className="section-title">Where the money comes from, year by year</h2>
        <p className="section-sub">Revenue by stream, C$ millions. {sel.year} is highlighted. 2026 covers nine months.</p>
        <div className="multiples">
          {STREAMS.slice(1).map((x) => (
            <div className="panel multiple" key={x.id}>
              <h3>{x.name}</h3>
              <p>{x.blurb}</p>
              <Bars
                rows={yrs.map((a) => ({ x: a.quarters.length === 4 ? String(a.year).slice(2) : `’${String(a.year).slice(2)} 9M`, y: a[x.key], year: a.year }))}
                xKey="x" yKey="y" name={x.name} fmt={(v) => `${num(v, 0)}`} isHi={(r) => r.year === sel.year} height={190}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 'var(--gap)' }}>
        <h2>How the bridge is calculated</h2>
        <div className="prose">
          <p>
            For each stream, revenue = departing passengers × revenue per departing passenger. Comparing two periods
            (same quarters, so seasonality cancels out):
          </p>
          <ul>
            <li><b>Traveller numbers</b> = change in passengers × the earlier revenue per passenger.</li>
            <li><b>Published fee increases</b> = the earlier revenue × the change in the GTAA’s published rate index
              (aeronautical) or the improvement-fee rate (AIF).</li>
            <li><b>Other per-traveller gains</b> = the rest of the change in revenue per passenger: bigger aircraft,
              more international flying, more spending.</li>
            <li><b>Interaction</b> = change in passengers × change in revenue per passenger, the part caused by both moving at once.</li>
          </ul>
          <p>The calculation lives in the SQL view <code>v_revenue_bridge</code> and is reconciled against an independent Python recalculation.</p>
        </div>
      </section>
    </>
  )
}
