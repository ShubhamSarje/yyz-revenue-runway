import { YEARS, isAvailable } from '../data'

/** The selector bar, styled as an airfield taxiway sign: yellow on black, selected item inverted. */
export default function Sign({ year, quarter, comparison, onChange }) {
  const setYear = (y) => {
    // Q4 2026 is not published yet: fall back to the 9-month view.
    const q = quarter !== 'all' && !isAvailable(y, quarter) ? 'all' : quarter
    onChange({ year: y, quarter: q })
  }
  return (
    <div className="sign-wrap">
      <div className="sign" role="toolbar" aria-label="Choose the period and comparison">
        <div className="sign-group" role="group" aria-label="Year">
          <span className="sign-key" aria-hidden="true">Year</span>
          {YEARS.map((y) => (
            <button key={y} aria-pressed={y === year} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
        <div className="sign-group" role="group" aria-label="Quarter">
          <span className="sign-key" aria-hidden="true">Quarter</span>
          {[1, 2, 3, 4].map((q) => {
            const ok = isAvailable(year, q)
            return (
              <button
                key={q}
                aria-pressed={q === quarter}
                disabled={!ok}
                title={ok ? undefined : 'Q4 2026 results are published around March 2027'}
                onClick={() => onChange({ quarter: q })}
              >
                Q{q}
              </button>
            )
          })}
          <button aria-pressed={quarter === 'all'} onClick={() => onChange({ quarter: 'all' })}>
            {year === 2026 ? '9M' : 'All'}
          </button>
        </div>
        <div className="sign-group" role="group" aria-label="Compare with">
          <span className="sign-key" aria-hidden="true">Compare</span>
          {['vs prior year', 'vs 2019'].map((c) => (
            <button key={c} aria-pressed={c === comparison} onClick={() => onChange({ comparison: c })}>
              {c === 'vs 2019' ? '2019' : 'Prior year'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
