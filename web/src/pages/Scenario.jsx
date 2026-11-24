import { useMemo, useState } from 'react'
import PhotoBand from '../components/PhotoBand'
import Waterfall from '../components/Waterfall'
import { verdict } from '../verdict'
import { money, num, dollars, signedMoney, pctText, pp } from '../format'

const DEFAULTS = { pax: 0, aero: 0, local: 40, conn: 10, share: 24.6, comm: 0, opex: 0 }
const PRESETS = [
  { id: 'base', name: 'Last 12 months', v: {} },
  { id: 'fees27', name: '2027 published fees', v: { aero: 5.3 } },
  { id: 'hub', name: 'Hub push: 30% connecting', v: { share: 30 } },
  { id: 'down', name: 'Traffic down 3%', v: { pax: -3 } },
  { id: 'up', name: 'Traffic up 4%', v: { pax: 4 } },
]

const LEVERS = [
  { k: 'pax', name: 'Passenger growth', min: -10, max: 10, step: 0.5, fmt: (v) => pctText(v), hint: 'Change in departing passengers' },
  { k: 'aero', name: 'Aeronautical fee change', min: -5, max: 10, step: 0.1, fmt: (v) => pctText(v), hint: 'Landing and terminal rates. The 2027 schedule is about +5.3%' },
  { k: 'local', name: 'Improvement fee, local passenger', min: 30, max: 50, step: 1, fmt: (v) => `$${v}`, hint: '2026 rate: $40' },
  { k: 'conn', name: 'Improvement fee, connecting passenger', min: 4, max: 15, step: 1, fmt: (v) => `$${v}`, hint: '2026 rate: $10' },
  { k: 'share', name: 'Connecting share of passengers', min: 15, max: 35, step: 0.5, fmt: (v) => `${num(v, 1)}%`, hint: 'First nine months of 2026: 24.6%' },
  { k: 'comm', name: 'Commercial spend per traveller', min: -10, max: 10, step: 0.5, fmt: (v) => pctText(v), hint: 'Parking, retail, food' },
  { k: 'opex', name: 'Operating cost growth (excl. ground rent)', min: -5, max: 15, step: 0.5, fmt: (v) => pctText(v), hint: 'Ground rent is recalculated at the 12% top rate' },
]

export default function Scenario({ data }) {
  const [v, setV] = useState(DEFAULTS)
  const [preset, setPreset] = useState('base')

  const base = useMemo(() => {
    const w = data.quarters.slice(-4)
    const s = (f) => w.reduce((a, r) => a + r[f], 0)
    return {
      label: `${w[0].period.replace(/(\d{4})Q(\d)/, 'Q$2 $1')} to ${w[3].period.replace(/(\d{4})Q(\d)/, 'Q$2 $1')}`,
      enp: s('enplaned_pax'), aero: s('aero_revenue'), comm: s('commercial_revenue'), aif: s('aif_revenue'),
      rev: s('revenue_total'), opex: s('opex_before_amort'), rent: s('ground_rent'),
    }
  }, [data])

  const out = useMemo(() => {
    const P0 = base.enp
    const P1 = P0 * (1 + v.pax / 100)
    const s0 = DEFAULTS.share / 100
    const s1 = v.share / 100
    // collection factor: reported AIF vs posted rates at the base mix (airline collection fees, exemptions)
    const k = base.aif / (P0 * (s0 * DEFAULTS.conn + (1 - s0) * DEFAULTS.local))
    const streams = {
      aero: { r0: base.aero / P0, r1: (base.aero / P0) * (1 + v.aero / 100) },
      aif: { r0: base.aif / P0, r1: k * (s1 * v.conn + (1 - s1) * v.local), rPrice: k * (s0 * v.conn + (1 - s0) * v.local) },
      comm: { r0: base.comm / P0, r1: (base.comm / P0) * (1 + v.comm / 100) },
    }
    const eff = { volume_effect: 0, published_price_effect: 0, other_per_pax_effect: 0, interaction_effect: 0 }
    const rev = {}
    for (const [id, st] of Object.entries(streams)) {
      rev[id] = P1 * st.r1
      eff.volume_effect += (P1 - P0) * st.r0
      eff.interaction_effect += (P1 - P0) * (st.r1 - st.r0)
      const rate = (st.r1 - st.r0) * P0
      const published = id === 'aero' ? rate : id === 'aif' ? (st.rPrice - st.r0) * P0 : 0
      eff.published_price_effect += published
      eff.other_per_pax_effect += rate - published
    }
    const revenue = rev.aero + rev.aif + rev.comm
    const rent = base.rent + 0.12 * (revenue - base.rev)
    const opex = (base.opex - base.rent) * (1 + v.opex / 100) + rent
    const ebitda = revenue - opex
    return {
      rev, revenue, opex, rent, ebitda, margin: (100 * ebitda) / revenue, perPax: revenue / P1,
      bridge: { ...eff, revenue_change: revenue - base.rev },
    }
  }, [base, v])

  const baseEbitda = base.rev - base.opex
  const baseMargin = (100 * baseEbitda) / base.rev
  const verdictRow = Math.abs(out.bridge.revenue_change) > 0.5 ? verdict(out.bridge) : null

  const set = (k, val) => { setV((s) => ({ ...s, [k]: val })); setPreset(null) }
  const applyPreset = (p) => { setV({ ...DEFAULTS, ...p.v }); setPreset(p.id) }

  return (
    <>
      <PhotoBand photo="approach" size="slim">
        <h2>Scenario planner</h2>
        <p>Move the levers to see what drives next year’s revenue: more travellers, or more per traveller.</p>
      </PhotoBand>

      <p className="page-intro">
        The starting point is the last twelve reported months (<b>{base.label}</b>): revenue of <b>{money(base.rev)}</b> and
        EBITDA of <b>{money(baseEbitda)}</b>. This page ignores the Year and Quarter selection.
      </p>

      <div className="scenario">
        <section className="panel">
          <div className="presets" role="group" aria-label="Preset scenarios">
            {PRESETS.map((p) => (
              <button key={p.id} aria-pressed={preset === p.id} onClick={() => applyPreset(p)}>{p.name}</button>
            ))}
          </div>
          <div className="levers">
            {LEVERS.map((l) => (
              <div className="lever" key={l.k}>
                <label htmlFor={`lv-${l.k}`}>
                  <span>{l.name}<small>{l.hint}</small></span>
                  <output htmlFor={`lv-${l.k}`}>{l.fmt(v[l.k])}</output>
                </label>
                <input id={`lv-${l.k}`} type="range" min={l.min} max={l.max} step={l.step} value={v[l.k]}
                  onChange={(e) => set(l.k, Number(e.target.value))} />
              </div>
            ))}
          </div>
        </section>

        <div className="stack sticky-col">
          <section className="kpis k3" style={{ margin: 0 }}>
            <div className="kpi">
              <p className="kpi-label">Revenue</p>
              <p className="kpi-value">{money(out.revenue)}</p>
              <p className="kpi-delta">{signedMoney(out.revenue - base.rev)} vs last 12 months</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">EBITDA</p>
              <p className="kpi-value">{money(out.ebitda)}</p>
              <p className="kpi-delta">{signedMoney(out.ebitda - baseEbitda)}</p>
            </div>
            <div className="kpi">
              <p className="kpi-label">EBITDA margin</p>
              <p className="kpi-value">{num(out.margin, 1)}%</p>
              <p className="kpi-delta">{pp(out.margin - baseMargin)}</p>
            </div>
          </section>

          <section className="panel">
            <h2>{verdictRow ? `In this scenario: ${verdictRow.answer.charAt(0).toLowerCase()}${verdictRow.answer.slice(1)}` : 'Move a lever to see where growth comes from'}</h2>
            <p className="sub">Change in revenue vs the last twelve months, split the same way as the revenue bridge.</p>
            {verdictRow && <Waterfall row={out.bridge} />}
            <div className="tbl-wrap" style={{ marginTop: 16 }}>
              <table className="tbl">
                <thead><tr><th>C$ millions</th><th>Last 12 months</th><th>Scenario</th></tr></thead>
                <tbody>
                  <tr><td>Aeronautical fees</td><td>{num(base.aero, 1)}</td><td>{num(out.rev.aero, 1)}</td></tr>
                  <tr><td>Improvement fee</td><td>{num(base.aif, 1)}</td><td>{num(out.rev.aif, 1)}</td></tr>
                  <tr><td>Commercial</td><td>{num(base.comm, 1)}</td><td>{num(out.rev.comm, 1)}</td></tr>
                  <tr className="total"><td>Revenue</td><td>{num(base.rev, 1)}</td><td>{num(out.revenue, 1)}</td></tr>
                  <tr><td>Ground rent</td><td>{num(base.rent, 1)}</td><td>{num(out.rent, 1)}</td></tr>
                  <tr><td>Operating costs</td><td>{num(base.opex, 1)}</td><td>{num(out.opex, 1)}</td></tr>
                  <tr><td>Revenue per departing passenger</td><td>{dollars(base.rev / base.enp)}</td><td>{dollars(out.perPax)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="note">
              A simple planning model, not a forecast. Revenue per passenger moves only through the levers; the improvement
              fee keeps today’s gap between posted rates and collected revenue (airline collection fees, exemptions).
              Each one-point rise in the connecting share costs about $7M a year at 2026 rates.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
