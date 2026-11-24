import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Controls from './components/Controls'
import Board from './components/Board'
import Answer from './pages/Answer'
import Traffic from './pages/Traffic'
import Unit from './pages/Unit'
import Cost from './pages/Cost'
import Credit from './pages/Credit'
import Scenario from './pages/Scenario'
import Method from './pages/Method'
import { loadData, getSelection, YEARS, isAvailable } from './data'

const SECTIONS = [
  { id: 'answer', name: 'The answer', sub: 'where the growth came from' },
  { id: 'findings', name: 'What 35 quarters show', sub: 'seven findings, each traced to a GTAA report page' },
  { id: 'traffic', name: 'Traffic and capacity', sub: 'passengers, flights, the hub mix and US flying' },
  { id: 'unit', name: 'Unit economics', sub: 'per departing passenger, before and after inflation' },
  { id: 'cost', name: 'Cost and margin', sub: 'where the money goes' },
  { id: 'credit', name: 'Credit health', sub: 'debt, leverage and covenants' },
  { id: 'scenario', name: 'Scenario planner', sub: 'move a lever and the board flips to the scenario' },
  { id: 'method', name: 'Methodology', sub: 'sources, checks and limitations' },
]

const STORY = [
  { id: 'F1', sec: 'answer', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'Growth came from price, not volume',
    text: '2025 revenue was 37% above 2019 on 6.5% fewer passengers. Published fee increases explain 57% of the $564M gain.' },
  { id: 'F2', sec: 'traffic', target: 't-hub', sel: { year: 2026, quarter: 'all', comparison: 'vs prior year' }, title: 'The hub paradox',
    text: 'About 80% of 2026 passenger growth is connecting travellers, who pay a $10 improvement fee instead of $40.' },
  { id: 'F3', sec: 'traffic', target: 't-us', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'US flying is down, but the risk is small',
    text: 'US flights are 15.7% below 2019, yet only $5–16M a year of revenue is at risk, under 1%.' },
  { id: 'F4', sec: 'cost', target: 't-rent', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'Ground rent takes 12 cents of each new dollar',
    text: 'Federal ground rent rose $65M since 2019, 11.6% of the revenue increase.' },
  { id: 'F5', sec: 'unit', target: 't-real', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'Shopping and parking barely grew after inflation',
    text: 'Commercial revenue per traveller is up only about 6% in real terms; fees are up 22–42%.' },
  { id: 'F6', sec: 'unit', target: 't-cpe', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'Airlines pay 46% more per passenger',
    text: 'Airline cost per passenger rose 46% since 2019, more than twice the 20.5% in announced rate increases.' },
  { id: 'F7', sec: 'cost', target: 't-margin', sel: { year: 2025, quarter: 'all', comparison: 'vs 2019' }, title: 'Margins did not move',
    text: 'EBITDA margin was 47.7% in 2019 and 47.5% in 2025: the extra revenue per traveller paid for higher costs.' },
]

const DEFAULTS = { year: 2025, quarter: 'all', comparison: 'vs 2019' }

function initialTheme() {
  try {
    const saved = localStorage.getItem('yyz-theme')
    if (saved === 'day' || saved === 'night') return saved
  } catch { /* storage unavailable */ }
  return 'night'
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [state, setState] = useState(DEFAULTS)
  const [metric, setMetric] = useState('index')
  const [theme, setTheme] = useState(initialTheme)
  const [playing, setPlaying] = useState(false)
  const [story, setStory] = useState(null)
  const [spot, setSpot] = useState(null)
  const timer = useRef(null)

  useEffect(() => { loadData().then(setData).catch((e) => setError(e.message)) }, [])
  useEffect(() => {
    document.documentElement.dataset.yyz = theme
    try { localStorage.setItem('yyz-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const sel = useMemo(() => (data ? getSelection(data, state.year, state.quarter, state.comparison) : null), [data, state])
  const update = useCallback((patch) => setState((s) => ({ ...s, ...patch })), [])

  // Timeline play: 2018 to 2026, one year per step
  const stop = useCallback(() => { clearInterval(timer.current); timer.current = null; setPlaying(false) }, [])
  const play = useCallback(() => {
    if (timer.current) { stop(); return }
    setPlaying(true)
    let i = 0
    setState((s) => ({ ...s, year: YEARS[0], quarter: 'all' }))
    timer.current = setInterval(() => {
      i += 1
      if (i >= YEARS.length) { stop(); return }
      setState((s) => ({ ...s, year: YEARS[i], quarter: 'all' }))
    }, 1300)
  }, [stop])
  useEffect(() => () => clearInterval(timer.current), [])

  // Spotlight a single panel during story mode (sections get the class through props)
  useEffect(() => {
    document.querySelectorAll('.panel.spot').forEach((el) => el.classList.remove('spot'))
    if (spot?.startsWith('t-')) document.getElementById(spot)?.classList.add('spot')
  }, [spot])

  // Story mode: each step sets the period, scrolls to its section and spotlights it
  const goStory = useCallback((i) => {
    if (i == null || i < 0 || i >= STORY.length) { setStory(null); setSpot(null); return }
    stop()
    const s = STORY[i]
    setState(s.sel)
    setStory(i)
    setSpot(s.target || s.sec)
    const el = document.getElementById(s.target || s.sec)
    el?.scrollIntoView({ behavior: 'smooth', block: s.target ? 'center' : 'start' })
  }, [stop])

  // Keyboard: arrows step through years (or quarters), space plays, Escape closes story mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); play() }
      if (e.key === 'Escape') goStory(null)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowRight' ? 1 : -1
        setState((s) => {
          if (s.quarter === 'all') return { ...s, year: Math.min(2026, Math.max(2018, s.year + dir)) }
          let y = s.year
          let q = s.quarter + dir
          if (q > 4) { y += 1; q = 1 }
          if (q < 1) { y -= 1; q = 4 }
          if (y < 2018 || !isAvailable(y, q)) return s
          return { ...s, year: y, quarter: q }
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play, goStory])

  return (
    <>
      <div className="sky" aria-hidden="true">
        <i style={{ width: 620, height: 620, left: '-10%', top: '30%', background: 'var(--blob1)' }} />
        <i style={{ width: 640, height: 520, right: '-12%', top: '60%', background: 'var(--blob2)' }} />
        <i style={{ width: 560, height: 520, left: '30%', top: '90%', background: 'var(--blob3)' }} />
      </div>

      <div className="page">
        <header className="hero">
          <img src="img/cn-tower-porter-1600.webp" srcSet="img/cn-tower-porter-900.webp 900w, img/cn-tower-porter-1600.webp 1600w"
            sizes="(max-width: 1280px) 100vw, 1240px" alt="A Porter Dash 8 flying past the CN Tower in Toronto" fetchPriority="high" />
          <div className="hero-shade" />
          <div className="glass topbar">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">YYZ</span>
              <div>
                <h1>YYZ Revenue Runway</h1>
                <p>Toronto Pearson revenue and operations dashboard</p>
              </div>
            </div>
            <div className="top-actions">
              <button className="chip-btn" aria-pressed={story != null} onClick={() => goStory(story == null ? 0 : null)}>
                {story == null ? 'Story mode' : 'Exit story'}
              </button>
              <button className="chip-btn" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
                aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} theme`}>
                {theme === 'night' ? 'Day' : 'Night'}
              </button>
            </div>
          </div>
          <div className="hero-q">
            <h2>Is Pearson’s revenue growth coming from more travellers, or from charging each traveller more?</h2>
            <p>35 quarters of GTAA filings, Q1 2018 to Q3 2026, rebuilt in SQL.</p>
          </div>
          <a className="credit" href="https://www.pexels.com/photo/17796157/" target="_blank" rel="noreferrer">Photo: Mateusz / Pexels</a>
        </header>

        {sel && (
          <Controls year={state.year} quarter={state.quarter} comparison={state.comparison}
            label={sel.label} baseLabel={sel.baseLabel} playing={playing} onPlay={play} onChange={update} />
        )}
        {error && <p className="banner">{error}. Reload the page to try again.</p>}
        {!data && !error && <p className="section-sub" style={{ marginTop: 90 }}>Loading 35 quarters of GTAA filings…</p>}

        {sel && (
          <>
            <Board data={data} sel={sel} metric={metric} onMetric={setMetric} />
            <Banners sel={sel} />
            <nav className="jump" aria-label="Jump to a section">
              {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.name}</a>)}
            </nav>

            <Section s={SECTIONS[0]} spot={spot}><Answer data={data} sel={sel} metric={metric} onMetric={setMetric} /></Section>
            <Section s={SECTIONS[1]} spot={spot}>
              <ol className="findings">
                {STORY.map((f, i) => (
                  <li key={f.id}>
                    <button className="finding" onClick={() => goStory(i)}>
                      <span className="fid">{f.id} · show me</span>
                      <b>{f.title}</b>
                      <span className="t">{f.text}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Section>
            <Section s={SECTIONS[2]} spot={spot}><Traffic data={data} sel={sel} /></Section>
            <Section s={SECTIONS[3]} spot={spot}><Unit data={data} sel={sel} /></Section>
            <Section s={SECTIONS[4]} spot={spot}><Cost data={data} sel={sel} /></Section>
            <Section s={SECTIONS[5]} spot={spot}><Credit data={data} sel={sel} /></Section>
            <Section s={SECTIONS[6]} spot={spot}><Scenario data={data} /></Section>
            <Section s={SECTIONS[7]} spot={spot}><Method /></Section>
          </>
        )}

        <footer className="footer">
          <span>Independent analysis using public GTAA reports, not affiliated with the GTAA or Toronto Pearson.</span>
          <span>Keys: <span className="kbd">←</span><span className="kbd">→</span> step · <span className="kbd">Space</span> play</span>
        </footer>
      </div>

      {story != null && (
        <div className="board-glass story" role="dialog" aria-label="Story mode">
          <div className="story-top">
            <span>Finding {story + 1} of {STORY.length}</span>
            <span className="story-dots" aria-hidden="true">{STORY.map((_, i) => <i key={i} className={i === story ? 'on' : ''} />)}</span>
          </div>
          <h3>{STORY[story].title}</h3>
          <p>{STORY[story].text}</p>
          <div className="story-actions">
            <button onClick={() => goStory(null)}>Close</button>
            <button onClick={() => goStory(story - 1)} disabled={story === 0}>Back</button>
            <button className="primary" onClick={() => goStory(story + 1 < STORY.length ? story + 1 : null)}>
              {story + 1 < STORY.length ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ s, spot, children }) {
  return (
    <section id={s.id} className={`sec${spot === s.id ? ' spot' : ''}`} aria-labelledby={`${s.id}-h`}>
      <div className="sec-head">
        <h2 id={`${s.id}-h`}>{s.name}</h2>
        <p>{s.sub}</p>
      </div>
      {children}
    </section>
  )
}

function Banners({ sel }) {
  const msgs = []
  if (sel.cur?.covid || sel.base?.covid) msgs.push(['COVID-19 period.', 'Travel collapsed in 2020–21, so changes involving these quarters reflect the pandemic, not pricing decisions.'])
  else if (sel.cur?.omicron || sel.base?.omicron) msgs.push(['Omicron wave.', 'Q1 2022 traffic was still depressed by the Omicron variant.'])
  if (sel.cur?.rent_relief || sel.base?.rent_relief) msgs.push(['Ground rent relief.', 'Q4 2020 includes a one-off federal ground rent credit.'])
  if (sel.year === 2026 && sel.quarter === 'all') msgs.push(['Nine months only.', '2026 shows Q1–Q3 and is compared with the same nine months; Q4 2026 is published around March 2027.'])
  return msgs.map(([b, t]) => (
    <div className="banner" role="status" key={b}>
      <span className="banner-icon" aria-hidden="true">i</span>
      <span><strong>{b}</strong> {t}</span>
    </div>
  ))
}
