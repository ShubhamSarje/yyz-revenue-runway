-- YYZ Revenue Runway: 03 year-over-year and vs-2019 changes (same quarter)
--
-- What this teaches
--   LAG(x, 1) OVER (PARTITION BY quarter ORDER BY year)
--       PARTITION BY quarter splits the 35 rows into four groups (all Q1s, all Q2s, ...).
--       ORDER BY year lines each group up in time, and LAG(x, 1) returns the previous row's x:
--       the same quarter one year earlier. Rows are not collapsed (unlike GROUP BY).
--       Safer than LAG(x, 4) OVER (ORDER BY period_start), which silently breaks if a quarter is missing.
--   MAX(CASE WHEN year = 2019 THEN x END) OVER (PARTITION BY quarter)
--       A windowed aggregate: copies the 2019 value of the same quarter onto every row.
--   NULLIF(y, 0) avoids division by zero.
--
-- Output: view v_quarterly_changes, one row per quarter.

create or replace view v_quarterly_changes with (security_invoker = true) as
with w as (
  select
    k.*,
    -- same quarter, previous year
    lag(revenue_total,        1) over by_q as revenue_total_py,
    lag(aero_revenue,         1) over by_q as aero_revenue_py,
    lag(commercial_revenue,   1) over by_q as commercial_revenue_py,
    lag(aif_revenue,          1) over by_q as aif_revenue_py,
    lag(pax_total,            1) over by_q as pax_total_py,
    lag(movements,            1) over by_q as movements_py,
    lag(seats,                1) over by_q as seats_py,
    lag(ebitda,               1) over by_q as ebitda_py,
    lag(opex_before_amort,    1) over by_q as opex_py,
    lag(revenue_per_enplaned, 1) over by_q as revenue_per_enplaned_py,
    lag(transborder_movements,1) over by_q as transborder_movements_py,
    -- same quarter, 2019 (pre-COVID baseline)
    max(case when year = 2019 then revenue_total end)        over q_all as revenue_total_2019,
    max(case when year = 2019 then aero_revenue end)         over q_all as aero_revenue_2019,
    max(case when year = 2019 then commercial_revenue end)   over q_all as commercial_revenue_2019,
    max(case when year = 2019 then aif_revenue end)          over q_all as aif_revenue_2019,
    max(case when year = 2019 then pax_total end)            over q_all as pax_total_2019,
    max(case when year = 2019 then movements end)            over q_all as movements_2019,
    max(case when year = 2019 then seats end)                over q_all as seats_2019,
    max(case when year = 2019 then ebitda end)               over q_all as ebitda_2019,
    max(case when year = 2019 then opex_before_amort end)    over q_all as opex_2019,
    max(case when year = 2019 then revenue_per_enplaned end) over q_all as revenue_per_enplaned_2019,
    max(case when year = 2019 then revenue_per_enplaned_real2019 end) over q_all as revenue_per_enplaned_real_2019,
    max(case when year = 2019 then transborder_movements end) over q_all as transborder_movements_2019
  from quarterly_kpi k
  window by_q  as (partition by quarter order by year),
         q_all as (partition by quarter)
)
select
  period, year, quarter, period_start, covid_period, omicron_flag,
  revenue_total, pax_total, movements, ebitda, revenue_per_enplaned, revenue_per_enplaned_real2019,
  -- year-over-year, %
  round(100 * (revenue_total        / nullif(revenue_total_py, 0)        - 1), 1) as revenue_yoy_pct,
  round(100 * (aero_revenue         / nullif(aero_revenue_py, 0)         - 1), 1) as aero_yoy_pct,
  round(100 * (commercial_revenue   / nullif(commercial_revenue_py, 0)   - 1), 1) as commercial_yoy_pct,
  round(100 * (aif_revenue          / nullif(aif_revenue_py, 0)          - 1), 1) as aif_yoy_pct,
  round(100 * (pax_total            / nullif(pax_total_py, 0)            - 1), 1) as pax_yoy_pct,
  round(100 * (movements            / nullif(movements_py, 0)            - 1), 1) as movements_yoy_pct,
  round(100 * (seats                / nullif(seats_py, 0)                - 1), 1) as seats_yoy_pct,
  round(100 * (ebitda               / nullif(ebitda_py, 0)               - 1), 1) as ebitda_yoy_pct,
  round(100 * (opex_before_amort    / nullif(opex_py, 0)                 - 1), 1) as opex_yoy_pct,
  round(100 * (revenue_per_enplaned / nullif(revenue_per_enplaned_py, 0) - 1), 1) as revenue_per_enplaned_yoy_pct,
  -- partial StatCan quarters (Q3 2026: two months) are not compared
  case when statcan_complete_quarter then
    round(100 * (transborder_movements / nullif(transborder_movements_py, 0) - 1), 1) end as transborder_yoy_pct,
  -- growth gap: revenue growth minus passenger growth (percentage points)
  round(100 * (revenue_total / nullif(revenue_total_py, 0) - pax_total / nullif(pax_total_py, 0)), 1) as revenue_minus_pax_yoy_pp,
  -- operating leverage: revenue growth minus cost growth (percentage points)
  round(100 * (revenue_total / nullif(revenue_total_py, 0) - opex_before_amort / nullif(opex_py, 0)), 1) as revenue_minus_opex_yoy_pp,
  -- vs same quarter of 2019, %
  round(100 * (revenue_total        / nullif(revenue_total_2019, 0)        - 1), 1) as revenue_vs2019_pct,
  round(100 * (aero_revenue         / nullif(aero_revenue_2019, 0)         - 1), 1) as aero_vs2019_pct,
  round(100 * (commercial_revenue   / nullif(commercial_revenue_2019, 0)   - 1), 1) as commercial_vs2019_pct,
  round(100 * (aif_revenue          / nullif(aif_revenue_2019, 0)          - 1), 1) as aif_vs2019_pct,
  round(100 * (pax_total            / nullif(pax_total_2019, 0)            - 1), 1) as pax_vs2019_pct,
  round(100 * (movements            / nullif(movements_2019, 0)            - 1), 1) as movements_vs2019_pct,
  round(100 * (seats                / nullif(seats_2019, 0)                - 1), 1) as seats_vs2019_pct,
  round(100 * (ebitda               / nullif(ebitda_2019, 0)               - 1), 1) as ebitda_vs2019_pct,
  round(100 * (opex_before_amort    / nullif(opex_2019, 0)                 - 1), 1) as opex_vs2019_pct,
  round(100 * (revenue_per_enplaned / nullif(revenue_per_enplaned_2019, 0) - 1), 1) as revenue_per_enplaned_vs2019_pct,
  round(100 * (revenue_per_enplaned_real2019 / nullif(revenue_per_enplaned_real_2019, 0) - 1), 1) as revenue_per_enplaned_real_vs2019_pct,
  case when statcan_complete_quarter then
    round(100 * (transborder_movements / nullif(transborder_movements_2019, 0) - 1), 1) end as transborder_vs2019_pct
from w;

-- Example: the latest four quarters
-- select period, revenue_yoy_pct, pax_yoy_pct, revenue_minus_pax_yoy_pp, revenue_vs2019_pct, pax_vs2019_pct
-- from v_quarterly_changes order by period_start desc limit 4;
