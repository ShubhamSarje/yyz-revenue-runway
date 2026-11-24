import { useEffect, useMemo, useState } from 'react'
import Sign from './components/Sign'
import Summary from './pages/Summary'
import PhotoBand from './components/PhotoBand'
import { TAB_PHOTO } from './photos'
import { loadData, getSelection } from './data'

export const TABS = [
  { id: 'summary', name: 'Executive summary' },
  { id: 'bridge', name: 'Revenue bridge' },
  { id: 'traffic', name: 'Traffic & capacity' },
  { id: 'unit', name: 'Unit economics' },
  { id: 'cost', name: 'Cost & margin' },
  { id: 'credit', name: 'Credit health' },
  { id: 'scenario', name: 'Scenario planner' },
  { id: 'method', name: 'Methodology' },
]

const DEFAULTS = { year: 2025, quarter: 'all', comparison: 'vs 2019', tab: 'summary' }

function readHash() {
  const p = new URLSearchParams(window.location.hash.slice(1))
  const year = Number(p.get('y'))
  const q = p.get('q')
  return {
    year: year >= 2018 && year <= 2026 ? year : DEFAULTS.year,
    quarter: q && /^[1-4]$/.test(q) ? Number(q) : DEFAULTS.quarter,
    comparison: p.get('c') === 'py' ? 'vs prior year' : DEFAULTS.comparison,
    tab: TABS.some((t) => t.id === p.get('tab')) ? p.get('tab') : DEFAULTS.tab,
  }
}

function initialTheme() {
  try {
    const saved = localStorage.getItem('yyz-theme')
    if (saved === 'day' || saved === 'night') return saved
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [state, setState] = useState(readHash)
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => { loadData().then(setData).catch((e) => setError(e.message)) }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('yyz-theme', theme) } catch { /* ignore */ }
  }, [theme])

  useEffect(() => {
    if (state.year === 2026 && state.quarter === 4) setState((s) => ({ ...s, quarter: 'all' }))
    const p = new URLSearchParams({ y: state.year, q: state.quarter, c: state.comparison === 'vs 2019' ? '2019' : 'py', tab: state.tab })
    window.history.replaceState(null, '', `#${p}`)
  }, [state])

  const sel = useMemo(
    () => (data ? getSelection(data, state.year, state.quarter, state.comparison) : null),
    [data, state.year, state.quarter, state.comparison],
  )
  const update = (patch) => setState((s) => ({ ...s, ...patch }))
  const goTo = (tab) => { update({ tab }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">YYZ</span>
          <div>
            <h1>YYZ Revenue Runway</h1>
            <p>Toronto Pearson Revenue & Operations Dashboard</p>
          </div>
        </div>
        <div className="theme-toggle" role="group" aria-label="Colour theme">
          <button aria-pressed={theme === 'day'} onClick={() => setTheme('day')}>Day</button>
          <button aria-pressed={theme === 'night'} onClick={() => setTheme('night')}>Night</button>
        </div>
      </header>

      <Sign year={state.year} quarter={state.quarter} comparison={state.comparison} onChange={update} />

      <nav className="tabs" role="tablist" aria-label="Dashboard pages">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={state.tab === t.id} onClick={() => update({ tab: t.id })}>
            {t.name}
          </button>
        ))}
      </nav>

      {sel && <Banners sel={sel} />}

      <main>
        {error && <p className="banner">{error}. Reload the page to try again.</p>}
        {!data && !error && <p className="section-sub">Loading 35 quarters of GTAA filings…</p>}
        {sel && state.tab === 'summary' && <Summary data={data} sel={sel} goTo={goTo} />}
        {sel && state.tab !== 'summary' && (
          <>
            <PhotoBand photo={TAB_PHOTO[state.tab]} size="slim">
              <h2>{TABS.find((t) => t.id === state.tab).name}</h2>
            </PhotoBand>
            <p className="section-sub">This page is next in the build.</p>
          </>
        )}
      </main>

      <footer className="footer">
        <span>Independent analysis using public GTAA reports, not affiliated with the GTAA or Toronto Pearson.</span>
        <span>Data: GTAA MD&A Q1 2018 – Q3 2026 · Statistics Canada</span>
      </footer>
    </div>
  )
}

function Banners({ sel }) {
  const msgs = []
  const covid = sel.cur?.covid || sel.base?.covid
  if (covid) msgs.push(['COVID-19 period.', 'Travel collapsed in 2020–21, so changes involving these quarters reflect the pandemic, not pricing decisions.'])
  else if (sel.cur?.omicron || sel.base?.omicron) msgs.push(['Omicron wave.', 'Q1 2022 traffic was still depressed by the Omicron variant.'])
  if (sel.cur?.rent_relief || sel.base?.rent_relief) msgs.push(['Ground rent relief.', 'Q4 2020 includes a one-off federal ground rent credit.'])
  if (sel.year === 2026 && sel.quarter === 'all') msgs.push(['9 months only.', '2026 shows Q1–Q3 and is compared with the same nine months; Q4 2026 is published around March 2027.'])
  if (!msgs.length) return null
  return msgs.map(([b, t]) => (
    <div className="banner" role="status" key={b}>
      <span className="banner-icon" aria-hidden="true">i</span>
      <span><strong>{b}</strong> {t}</span>
    </div>
  ))
}
