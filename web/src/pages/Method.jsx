
const REPO = 'https://github.com/ShubhamSarje/yyz-revenue-runway'

const CHECKS = [
  'Revenue lines add up to total revenue in all 35 quarters (aeronautical, commercial, improvement fee)',
  'Operating cost lines add up and EBITDA = revenue − operating costs in all 35 quarters',
  'Four quarters add up to the annual report for all 8 full years (56 of 56 checks)',
  'Load factor rebuilt from passengers ÷ seats matches the GTAA in 21 of 21 non-COVID quarters checked',
  'Statistics Canada aircraft movements are within about 1% of the GTAA’s in 34 of 34 complete quarters',
  'Rebuilt airline cost per passenger matches the GTAA’s published figure within 10 cents (2023–2025)',
  'Rebuilt debt per departing passenger matches the GTAA within $1 outside COVID',
  '13 of 13 control totals from the SQL views match an independent Python recalculation',
]

export default function Method() {
  return (
    <>

      <div className="method-grid">
        <div className="panel prose">
          <h3>The question</h3>
          <p>
            Is Toronto Pearson’s revenue growth coming from more travellers, or from charging each traveller more? Every
            section answers part of it for the period chosen on the timeline.
          </p>

          <h3>Data</h3>
          <ul>
            <li><b>GTAA quarterly and annual reports</b> (management’s discussion and analysis), 35 reports from Q1 2018 to Q3 2026: revenue by line, costs, passengers, flights, seats, debt and covenants.</li>
            <li><b>GTAA aeronautical fee schedules</b>, January 2018 to January 2027: landing and terminal rates and the airport improvement fee.</li>
            <li><b>Statistics Canada</b> tables 23-10-0008-01 and 23-10-0302-01 (aircraft movements by sector, for US flights) and 18-10-0004-01 (Ontario CPI, to convert to 2019 dollars).</li>
          </ul>

          <h3>Pipeline</h3>
          <p>
            Python downloads the reports and extracts each figure, keeping the page it came from; scanned pages are read
            with OCR and cross-checked. Where the GTAA restated a number a year later, the restated figure is used. Q4 is
            the annual figure minus the first nine months.
          </p>
          <p>
            The clean table is loaded into PostgreSQL (Supabase), where SQL views calculate year-over-year and vs-2019
            changes with window functions (<code>LAG() OVER (PARTITION BY quarter ORDER BY year)</code>), trailing
            twelve-month totals and the revenue bridge. This dashboard reads a snapshot exported from those views.
          </p>

          <h3>Definitions</h3>
          <ul>
            <li><b>Departing passengers</b> (enplaned) are half of all passengers, the base the GTAA uses for per-passenger figures.</li>
            <li><b>Airline cost per passenger</b> is aeronautical revenue ÷ departing passengers. It matches the GTAA’s published figure, which let us extend it back to 2019.</li>
            <li><b>2019 dollars</b> divide each quarter by Ontario CPI relative to its 2019 average.</li>
            <li><b>Revenue bridge</b>: revenue = departing passengers × revenue per departing passenger, for each stream and the same quarters in both periods. Traveller numbers = change in passengers × the earlier revenue per passenger. Published fee increases = earlier revenue × the change in the GTAA’s published rate index (aeronautical) or improvement-fee rate. Other per-traveller gains = the rest of the change in revenue per passenger. Interaction = change in passengers × change in revenue per passenger. The four add up exactly to the change in revenue (SQL view <code>v_revenue_bridge</code>).</li>
          </ul>

          <h3>Limitations</h3>
          <ul>
            <li>Q4 2026 is not yet published (expected around March 2027), so 2026 is shown as nine months and compared with the same nine months.</li>
            <li>2020–2021 are shown but price/volume splits are hidden for comparisons involving them; Q1 2022 (Omicron) and the Q4 2020 ground rent credit are flagged.</li>
            <li>Statistics Canada has not yet published September 2026, so US flight figures for Q3 2026 are left out.</li>
            <li>Revenue at risk from US flights, the improvement fee given up through the passenger mix, and airline cost per passenger before 2023 are estimates, with the assumptions stated in FINDINGS.md.</li>
            <li>The connecting-passenger share is the GTAA’s estimate and is published only from 2021.</li>
          </ul>
        </div>

        <div className="stack">
          <section className="panel">
            <h2>How the numbers were checked</h2>
            <ul className="checks">
              {CHECKS.map((c) => (
                <li key={c}><span className="ok" aria-hidden="true">✓</span><span>{c}</span></li>
              ))}
            </ul>
          </section>
          <section className="panel prose">
            <h2>Code and findings</h2>
            <p style={{ marginTop: 6 }}>
              The Python scripts, SQL views, findings with a GTAA page reference for every number, and this dashboard’s
              source are on GitHub.
            </p>
            <p><a href={REPO} target="_blank" rel="noreferrer">github.com/ShubhamSarje/yyz-revenue-runway</a></p>
          </section>
          <section className="panel prose">
            <h2>Photo</h2>
            <p style={{ marginTop: 6 }}>
              <a href="https://www.pexels.com/photo/17796157/" target="_blank" rel="noreferrer">A Porter Dash 8 passing the CN Tower</a>{' '}
              by Mateusz, Pexels License.
            </p>
          </section>
          <section className="panel prose">
            <h2>About</h2>
            <p style={{ marginTop: 6 }}>
              Built by Shubham Sarje, data analyst in Toronto.{' '}
              <a href="https://linkedin.com/in/shubhamsarje" target="_blank" rel="noreferrer">LinkedIn</a>.
              Independent analysis using public GTAA reports, not affiliated with the GTAA or Toronto Pearson.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
