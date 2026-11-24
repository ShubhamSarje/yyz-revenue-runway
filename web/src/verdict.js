// Turns a revenue bridge row into the plain-language answer to the business question:
// is growth coming from more travellers, or from charging each traveller more?

export function verdict(row) {
  if (!row) return null
  const vol = Number(row.volume_effect)
  const perPax = Number(row.published_price_effect) + Number(row.other_per_pax_effect)
  const change = Number(row.revenue_change)
  if (change >= 0) {
    if (vol <= 0 && perPax > 0) return { answer: 'From charging each traveller more.', tone: 'price', aside: 'Passenger numbers actually fell.' }
    if (perPax <= 0 && vol > 0) return { answer: 'From more travellers.', tone: 'volume', aside: 'Revenue per traveller fell.' }
    const volShare = vol / (vol + perPax)
    if (volShare >= 0.65) return { answer: 'Mostly from more travellers.', tone: 'volume' }
    if (volShare <= 0.35) return { answer: 'Mostly from charging each traveller more.', tone: 'price' }
    return { answer: 'From both, in roughly equal parts.', tone: 'both' }
  }
  if (vol < 0 && perPax >= 0) return { answer: 'Revenue fell because travellers disappeared.', tone: 'volume', aside: 'Each traveller paid more, but not enough to offset it.' }
  if (vol >= 0 && perPax < 0) return { answer: 'Revenue fell because each traveller paid less.', tone: 'price' }
  return { answer: 'Fewer travellers, and less from each one.', tone: 'both' }
}
