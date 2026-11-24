"""Phase 3 checkpoint: recompute the SQL views independently in pandas and compare.

The SQL views (sql/03-05) are recalculated here from data/processed/kpi_quarterly.csv with
different code (pandas shift/rolling/merge instead of LAG/frames/self-joins). The script prints
control totals; sql/06_reconciliation.sql prints the same totals from Supabase. They must match.

Output: data/processed/reconciliation_python.csv
"""
import os
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k = pd.read_csv(os.path.join(BASE, 'data', 'processed', 'kpi_quarterly.csv')).sort_values('period_start')

# --- 03: year-over-year and vs 2019 (same quarter) ---
g = k.groupby('quarter')
yoy = 100 * (k.revenue_total / g.revenue_total.shift(1) - 1)
pax_yoy = 100 * (k.pax_total / g.pax_total.shift(1) - 1)
rev19 = k.quarter.map(k[k.year == 2019].set_index('quarter').revenue_total)
vs19 = 100 * (k.revenue_total / rev19 - 1)
real19 = k.quarter.map(k[k.year == 2019].set_index('quarter').revenue_per_enplaned_real2019)
real_vs19 = 100 * (k.revenue_per_enplaned_real2019 / real19 - 1)

# --- 04: trailing 12 months ---
r = k.set_index('period')
ttm_rev = r.revenue_total.rolling(4, min_periods=1).sum()
ttm_ebitda = r.ebitda.rolling(4, min_periods=1).sum()
ttm_pax = r.pax_total.rolling(4, min_periods=1).sum()
ttm_margin = (100 * ttm_ebitda / ttm_rev).round(1)
debt_calc = (r.total_debt / (ttm_pax / 2)).round(0)

# --- 05: revenue bridge, year vs 2019 and vs prior year (same quarters) ---
def bridge(cur_year, base_year):
    c = k[k.year == cur_year]
    b = k[(k.year == base_year) & k.quarter.isin(c.quarter)]
    p1, p0 = c.enplaned_pax.sum(), b.enplaned_pax.sum()
    out = {}
    for s, col, kcol in (('aeronautical', 'aero_revenue', 'aero_rate_index'),
                         ('commercial', 'commercial_revenue', None), ('aif', 'aif_revenue', 'aif_local')):
        R1, R0 = c[col].sum(), b[col].sum()
        r1, r0 = R1 / p1, R0 / p0
        kk = c[kcol].mean() / b[kcol].mean() if kcol else 1.0
        out[s] = dict(volume=(p1 - p0) * r0, rate=(r1 - r0) * p0, inter=(p1 - p0) * (r1 - r0),
                      price=R0 * (kk - 1), change=R1 - R0)
    return out

rows = []
for cy, by, label in [(y, 2019, 'vs 2019') for y in range(2020, 2027)] + [(y, y - 1, 'vs prior year') for y in range(2019, 2027)]:
    for s, v in bridge(cy, by).items():
        rows.append(dict(year=cy, comparison=label, stream=s, **v))
br = pd.DataFrame(rows)
br['other'] = br.rate - br.price

controls = {
    'v_quarterly_changes: sum revenue_yoy_pct':        round(yoy.round(1).sum(), 1),
    'v_quarterly_changes: sum pax_yoy_pct':            round(pax_yoy.round(1).sum(), 1),
    'v_quarterly_changes: sum revenue_vs2019_pct':     round(vs19.round(1).sum(), 1),   # all rows, incl. 2018 (negative) and 2019 (zero)
    'v_quarterly_changes: 2026Q3 real rev/pax vs 2019 %': round(real_vs19[k.period == '2026Q3'].iloc[0], 1),
    'v_ttm: sum revenue_ttm':                          round(ttm_rev.sum(), 1),
    'v_ttm: sum ebitda_margin_ttm_pct':                round(ttm_margin.sum(), 1),
    'v_ttm: max abs debt/epax diff (complete windows)': float((debt_calc - r.debt_per_epax).iloc[3:].abs().max()),
    'v_revenue_bridge (year): sum volume_effect':      round(br.volume.round(1).sum(), 1),
    'v_revenue_bridge (year): sum published_price':    round(br.price.round(1).sum(), 1),
    'v_revenue_bridge (year): sum other_per_pax':      round(br.other.round(1).sum(), 1),
    'v_revenue_bridge (year): 2025 vs 2019 volume':    round(br[(br.year == 2025) & (br.comparison == 'vs 2019')].volume.round(1).sum(), 1),
    'v_revenue_bridge (year): 2025 vs 2019 price':     round(br[(br.year == 2025) & (br.comparison == 'vs 2019')].price.round(1).sum(), 1),
    'v_revenue_bridge (year): 2026 vs prior volume':   round(br[(br.year == 2026) & (br.comparison == 'vs prior year')].volume.round(1).sum(), 1),
}
out = pd.DataFrame({'control': list(controls), 'python': list(controls.values())})
out.to_csv(os.path.join(BASE, 'data', 'processed', 'reconciliation_python.csv'), index=False)
print(out.to_string(index=False))
