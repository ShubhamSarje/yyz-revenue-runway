const n = (v, d = 0) =>
  v == null || Number.isNaN(v) ? '–' : v.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })

/** C$ millions -> "$2.09B" / "$563.6M" */
export const money = (m, d) => {
  if (m == null) return '–'
  const abs = Math.abs(m)
  const sign = m < 0 ? '−' : ''
  if (abs >= 1000) return `${sign}$${n(abs / 1000, d ?? 2)}B`
  return `${sign}$${n(abs, d ?? 1)}M`
}
export const signedMoney = (m, d) => (m == null ? '–' : `${m >= 0 ? '+' : ''}${money(m, d)}`)
export const dollars = (v, d = 2) => (v == null ? '–' : `$${n(v, d)}`)
export const num = n
export const millions = (v, d = 1) => (v == null ? '–' : `${n(v, d)}M`)
export const pctText = (v, d = 1) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v), d)}%`)
export const pp = (v, d = 1) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v), d)} pts`)
