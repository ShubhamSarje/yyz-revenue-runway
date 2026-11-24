import { YEARS, isAvailable } from '../data'

/** Sticky control bar: play, year timeline, quarter and comparison. Styled like the departure board. */
export default function Controls({ year, quarter, comparison, label, baseLabel, playing, onPlay, onChange }) {
  const i = YEARS.indexOf(year)
  const pct = (k) => `calc(10px + (100% - 20px) * ${k / (YEARS.length - 1)})`
  const setYear = (y) => {
    const q = quarter !== 'all' && !isAvailable(y, quarter) ? 'all' : quarter
    onChange({ year: y, quarter: q })
  }
  return (
    <div className="controls-wrap">
      <div className="board-glass controls" role="toolbar" aria-label="Choose the period">
        <button className="play" onClick={onPlay} aria-label={playing ? 'Pause timeline' : 'Play timeline 2018 to 2026'} title="Play (space)">
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="track">
          <div className="track-line" />
          <div className="track-fill" style={{ width: `calc((100% - 20px) * ${i / (YEARS.length - 1)})` }} />
          {YEARS.map((y, k) => (
            <button key={y} className="track-year" style={{ left: pct(k) }} aria-pressed={y === year} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
          <div className="knob" style={{ left: pct(i) }} />
          <input type="range" min={0} max={YEARS.length - 1} step={1} value={i} aria-label="Year"
            onChange={(e) => setYear(YEARS[Number(e.target.value)])} />
        </div>
        <div className="seg-sign" role="group" aria-label="Quarter">
          {[1, 2, 3, 4].map((q) => {
            const ok = isAvailable(year, q)
            return (
              <button key={q} aria-pressed={q === quarter} disabled={!ok} onClick={() => onChange({ quarter: q })}
                title={ok ? undefined : 'Q4 2026 results are published around March 2027'}>
                Q{q}
              </button>
            )
          })}
          <button aria-pressed={quarter === 'all'} onClick={() => onChange({ quarter: 'all' })}>{year === 2026 ? '9M' : 'Year'}</button>
        </div>
        <div className="seg-sign" role="group" aria-label="Compare with">
          {['vs prior year', 'vs 2019'].map((c) => (
            <button key={c} aria-pressed={c === comparison} onClick={() => onChange({ comparison: c })}>
              {c === 'vs 2019' ? 'vs 2019' : 'vs prior year'}
            </button>
          ))}
        </div>
        <span className="sel-label" aria-live="polite">{label}{baseLabel ? ` · vs ${baseLabel}` : ''}</span>
      </div>
    </div>
  )
}
