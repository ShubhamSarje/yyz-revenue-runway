import CountUp from './CountUp'
import { pct } from '../data'
import { pctText, pp } from '../format'

/** One key number with its change against the comparison period. */
export default function Kpi({ label, cur, base, format, kind = 'pct', vs, invert = false, note }) {
  let delta = null
  if (note) delta = <p className="kpi-delta">{note}</p>
  else if (base == null || cur == null) delta = <p className="kpi-delta">No comparison for this selection</p>
  else {
    const v = kind === 'pp' ? cur - base : pct(cur, base)
    const good = invert ? v < 0 : v > 0
    const cls = v === 0 || Math.abs(v) < 0.05 ? '' : good ? 'up' : 'down'
    delta = (
      <p className="kpi-delta">
        <span className={cls}>{kind === 'pp' ? pp(v) : pctText(v)}</span> {vs}
      </p>
    )
  }
  return (
    <div className="kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value"><CountUp value={cur} format={format} /></p>
      {delta}
    </div>
  )
}
