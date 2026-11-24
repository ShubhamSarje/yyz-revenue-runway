-- YYZ Revenue Runway: 06 reconciliation (Phase 3 checkpoint)
-- Control totals from the SQL views. scripts/05_reconcile_sql.py recomputes the same totals in pandas
-- with independent code; every value must match.

select 'v_quarterly_changes: sum revenue_yoy_pct' as control, sum(revenue_yoy_pct) as sql_value from v_quarterly_changes
union all select 'v_quarterly_changes: sum pax_yoy_pct', sum(pax_yoy_pct) from v_quarterly_changes
union all select 'v_quarterly_changes: sum revenue_vs2019_pct', sum(revenue_vs2019_pct) from v_quarterly_changes
union all select 'v_quarterly_changes: 2026Q3 real rev/pax vs 2019 %', max(revenue_per_enplaned_real_vs2019_pct) from v_quarterly_changes where period = '2026Q3'
union all select 'v_ttm: sum revenue_ttm', sum(revenue_ttm) from v_ttm
union all select 'v_ttm: sum ebitda_margin_ttm_pct', sum(ebitda_margin_ttm_pct) from v_ttm
union all select 'v_ttm: max abs debt/epax diff (complete windows)', max(abs(debt_per_epax_calculated - debt_per_epax_reported)) from v_ttm where ttm_complete
union all select 'v_revenue_bridge (year): sum volume_effect', sum(volume_effect) from v_revenue_bridge where grain = 'year' and stream <> 'total'
union all select 'v_revenue_bridge (year): sum published_price', sum(published_price_effect) from v_revenue_bridge where grain = 'year' and stream <> 'total'
union all select 'v_revenue_bridge (year): sum other_per_pax', sum(other_per_pax_effect) from v_revenue_bridge where grain = 'year' and stream <> 'total'
union all select 'v_revenue_bridge (year): 2025 vs 2019 volume', sum(volume_effect) from v_revenue_bridge where grain = 'year' and label = '2025' and comparison = 'vs 2019' and stream <> 'total'
union all select 'v_revenue_bridge (year): 2025 vs 2019 price', sum(published_price_effect) from v_revenue_bridge where grain = 'year' and label = '2025' and comparison = 'vs 2019' and stream <> 'total'
union all select 'v_revenue_bridge (year): 2026 vs prior volume', sum(volume_effect) from v_revenue_bridge where grain = 'year' and label = '2026' and comparison = 'vs prior year' and stream <> 'total'
union all select 'bridge rows add up: max abs residual', max(abs(volume_effect + published_price_effect + other_per_pax_effect + interaction_effect - revenue_change)) from v_revenue_bridge;
