// Data access for the dashboard. Everything comes from public/data/app_data.json,
// exported from the SQL views by scripts/06_export_app_data.py.

export const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
export const LAST_PERIOD = { year: 2026, quarter: 3 }

export async function loadData() {
  const res = await fetch('data/app_data.json')
  if (!res.ok) throw new Error(`Could not load dashboard data (${res.status})`)
  const d = await res.json()
  const byPeriod = Object.fromEntries(d.quarters.map((q) => [q.period, q]))
  return { ...d, byPeriod }
}

export const isAvailable = (year, quarter) =>
  year < LAST_PERIOD.year || (year === LAST_PERIOD.year && quarter <= LAST_PERIOD.quarter)

/** Quarters covered by a selection. quarter is 1-4 or 'all'. */
export function quartersOf(year, quarter) {
  const qs = quarter === 'all' ? [1, 2, 3, 4] : [quarter]
  return qs.filter((q) => isAvailable(year, q))
}

export function selectionLabel(year, quarter) {
  if (quarter !== 'all') return `Q${quarter} ${year}`
  const n = quartersOf(year, 'all').length
  return n === 4 ? `${year}` : `9 months ${year}`
}

const FLOWS = [
  'revenue_total', 'aero_revenue', 'commercial_revenue', 'aif_revenue', 'landing_fees', 'general_terminal',
  'concessions_rentals', 'parking_ground', 'other_revenue', 'ground_rent', 'pilt', 'goods_services',
  'salaries', 'opex_before_amort', 'ebitda', 'net_income', 'pax_total', 'pax_domestic', 'pax_international',
  'enplaned_pax', 'movements', 'mtow', 'seats', 'transborder_movements', 'itinerant_movements',
]

/** Sum flows over a set of quarters and derive per-unit ratios. Returns null if any quarter is missing. */
export function aggregate(data, year, qs) {
  const rows = qs.map((q) => data.byPeriod[`${year}Q${q}`])
  if (!rows.length || rows.some((r) => !r)) return null
  const a = { year, quarters: qs, rows }
  for (const f of FLOWS) a[f] = rows.reduce((s, r) => s + (r[f] ?? 0), 0)
  // deflator_2019 = quarter CPI / 2019 average CPI, so dividing converts to 2019 dollars
  const deflated = (f) => rows.reduce((s, r) => s + r[f] / r.deflator_2019, 0)
  a.revenue_real2019 = deflated('revenue_total')
  a.aero_real2019 = deflated('aero_revenue')
  a.commercial_real2019 = deflated('commercial_revenue')
  a.aif_real2019 = deflated('aif_revenue')
  a.opex_real2019 = deflated('opex_before_amort')
  a.rev_per_enplaned = a.revenue_total / a.enplaned_pax
  a.rev_per_enplaned_real = a.revenue_real2019 / a.enplaned_pax
  a.aero_per_enplaned = a.aero_revenue / a.enplaned_pax
  a.commercial_per_enplaned = a.commercial_revenue / a.enplaned_pax
  a.aif_per_enplaned = a.aif_revenue / a.enplaned_pax
  a.opex_per_enplaned = a.opex_before_amort / a.enplaned_pax
  a.ebitda_margin = (100 * a.ebitda) / a.revenue_total
  a.ground_rent_share = (100 * a.ground_rent) / a.revenue_total
  a.load_factor = (100 * a.pax_total) / a.seats
  a.pax_per_movement = (1000 * a.pax_total) / a.movements
  a.covid = rows.some((r) => r.covid_period)
  a.omicron = rows.some((r) => r.omicron_flag)
  a.rent_relief = rows.some((r) => r.ground_rent_relief_flag)
  a.statcan_complete = rows.every((r) => r.statcan_complete_quarter)
  return a
}

/** Current selection plus its comparison base (same quarters, prior year or 2019). */
export function getSelection(data, year, quarter, comparison) {
  const qs = quartersOf(year, quarter)
  const cur = aggregate(data, year, qs)
  const baseYear = comparison === 'vs 2019' ? 2019 : year - 1
  const base = baseYear === year ? null : aggregate(data, baseYear, qs)
  const grain = quarter === 'all' ? 'year' : 'quarter'
  const label = quarter === 'all' ? `${year}` : `${year}Q${quarter}`
  const bridge = base
    ? data.bridge.filter((b) => b.grain === grain && b.label === label && b.comparison === comparison)
    : []
  const baseLabel = !base ? null
    : quarter !== 'all' ? `Q${quarter} ${baseYear}`
    : qs.length === 4 ? `${baseYear}` : `9 months ${baseYear}`
  return { year, quarter, qs, comparison, baseYear, cur, base, bridge, label: selectionLabel(year, quarter), baseLabel }
}

export const pct = (cur, base) => (base == null || cur == null || base === 0 ? null : (100 * (cur - base)) / Math.abs(base))

/** Chart highlight range for the selected quarters, as x-axis labels. */
export const highlightOf = (sel) => [
  `Q${sel.qs[0]} ’${String(sel.year).slice(2)}`,
  `Q${sel.qs[sel.qs.length - 1]} ’${String(sel.year).slice(2)}`,
]

/** Full-year (or 9-month 2026) aggregates for every year. */
export const years = (data) => YEARS.map((y) => aggregate(data, y, quartersOf(y, 'all')))

/** Rolling four-quarter sums; returns null until four quarters exist. */
export function rolling(data, fn) {
  const q = data.quarters
  return q.map((_, i) => {
    if (i < 3) return null
    const w = q.slice(i - 3, i + 1)
    return fn(w)
  })
}
const sum = (rows, f) => rows.reduce((s, r) => s + (typeof f === 'function' ? f(r) : r[f]), 0)
export { sum }
