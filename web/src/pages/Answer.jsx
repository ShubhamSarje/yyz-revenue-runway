import { useState } from 'react'
import Waterfall, { EFFECTS } from '../components/Waterfall'
import MainChart from '../components/MainChart'
import { Bars } from '../components/Charts'
import { verdict } from '../verdict'
import { pct, years } from '../data'
import { money, signedMoney, signedNum, num, pctText } from '../format'

const STREAMS = [
  { id: 'total', name: 'Total revenue', short: 'Total' },
  { id: 'aeronautical', name: 'Aeronautical fees', short: 'Aeronautical', key: 'aero_revenue', blurb: 'Landing and terminal fees paid by airlines' },
  { id: 'commercial', name: 'Commercial', short: 'Commercial', key: 'commercial_revenue', blurb: 'Parking, retail, food, rentals and other' },
  { id: 'aif', name: 'Airport improvement fee', short: 'Improvement fee', key: 'aif_revenue', blurb: 'Per-passenger fee collected through ticket prices' },
]

export default function Answer({ data, sel, metric, onMetric }) {
  const [stream, setStream] = useState('total')
  const { cur, base, bridge, label, baseLabel } = sel
  const total = bridge.find((b) => b.stream === 'total')
  const row = bridge.find((b) => b.stream === stream)
  const v = verdict(total)
  const covid = row?.involves_covid
  const revChg = base ? pct(cur.revenue_total, base.revenue_total) : null
  const paxChg = base ? pct(cur.pax_total, base.pax_total) : null
  const yrs = years(data)
  const [showTable, setShowTable] = useState(false)

  return (
    <>
      <div className="grid-ans">
        <div className="panel">
          <p className="answer-q">Where did revenue growth come from in {label}{base ? `, vs ${baseLabel}` : ''}?</p>
          <h3 className="answer-a">{v ? v.answer : 'Pick a comparison to see the answer.'}</h3>
          {base ? (
            <p className="answer-lede">
              Pearson earned <b>{money(cur.revenue_total)}</b>, <b>{pctText(revChg)}</b> vs {baseLabel}, while passengers
              changed by <b>{pctText(paxChg)}</b>.
              {total && !total.involves_covid && Number(total.published_price_effect) !== 0 && (
                <> Published fee increases alone added <b>{signedMoney(Number(total.published_price_effect))}</b>.</>
              )}
              {v?.aside && <> {v.aside}</>}
            </p>
          ) : (
            <p className="answer-lede">2018 is the first year in this dashboard. Compare with 2019 instead.</p>
          )}
          {row && (
            <>
              <div className="row-head" style={{ marginBottom: 10 }}>
                <span className="sub" style={{ margin: 0 }}>{signedMoney(Number(row.revenue_change))} change, split into drivers</span>
                <div className="seg" role="group" aria-label="Revenue stream">
                  {STREAMS.map((x) => (
                    <button key={x.id} aria-pressed={x.id === stream} onClick={() => setStream(x.id)}>{x.short}</button>
                  ))}
                </div>
              </div>
              {covid ? (
                <p className="covid-note">
                  This comparison involves a COVID-affected period. With traffic down as much as 96%, a price and volume
                  split produces huge offsetting numbers that mean nothing, so only the totals are shown.
                </p>
              ) : (
                <Waterfall row={row} />
              )}
              <button className="link-btn" onClick={() => setShowTable((s) => !s)}>
                {showTable ? 'Hide' : 'Show'} every stream as a table
              </button>
              {showTable && (
                <div className="tbl-wrap" style={{ marginTop: 10 }}>
                  <table className="tbl">
                    <thead>
                      <tr><th>C$ millions</th><th>{baseLabel}</th><th>{label}</th><th>Change</th>
                        {!covid && EFFECTS.map((e) => <th key={e.key}><span className="swatch" style={{ background: e.color }} />{e.name}</th>)}</tr>
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
              )}
            </>
          )}
        </div>
        <MainChart data={data} sel={sel} metric={metric} onMetric={onMetric} />
      </div>

      <div className="multiples" style={{ marginTop: 'var(--gap)' }}>
        {STREAMS.slice(1).map((x) => (
          <div className="panel multiple" key={x.id}>
            <h3>{x.name}</h3>
            <p>{x.blurb}. C$ millions; {sel.year} highlighted.</p>
            <Bars
              rows={yrs.map((a) => ({ x: a.quarters.length === 4 ? `’${String(a.year).slice(2)}` : `’${String(a.year).slice(2)} 9M`, y: a[x.key], year: a.year }))}
              name={x.name} color={x.id === 'commercial' ? 'var(--c-other)' : 'var(--c-price)'}
              fmt={(val) => num(val, 0)} isHi={(r) => r.year === sel.year} height={180}
            />
          </div>
        ))}
      </div>
    </>
  )
}
