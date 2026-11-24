-- YYZ Revenue Runway: 04 trailing 12 months (rolling four quarters)
--
-- What this teaches
--   SUM(x) OVER (ORDER BY period_start ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)
--       A window FRAME: for each row, add the current quarter and the three before it.
--       The frame slides forward one quarter per row, so seasonality disappears
--       (every value covers one full year).
--   COUNT(*) OVER the same frame
--       How many quarters were actually in the frame: the first three rows have fewer than 4,
--       so their "trailing 12 months" values are flagged incomplete.
--   BOOL_OR(flag) OVER the same frame
--       True if any quarter in the frame is a COVID quarter.
--   A named WINDOW clause (window w as (...)) avoids repeating the same frame 20 times.
--
-- Built-in check: the GTAA computes debt per enplaned passenger on trailing-12-month traffic
-- (enplaned = half of total passengers). total_debt / (pax_ttm / 2) should reproduce its published figure.
--
-- Output: view v_ttm, one row per quarter.

create or replace view v_ttm with (security_invoker = true) as
select
  period, year, quarter, period_start,
  count(*)              over w as quarters_in_window,
  count(*) over w = 4          as ttm_complete,
  bool_or(covid_period) over w as window_includes_covid,
  sum(revenue_total)      over w as revenue_ttm,
  sum(aero_revenue)       over w as aero_revenue_ttm,
  sum(commercial_revenue) over w as commercial_revenue_ttm,
  sum(aif_revenue)        over w as aif_revenue_ttm,
  sum(opex_before_amort)  over w as opex_ttm,
  sum(ground_rent)        over w as ground_rent_ttm,
  sum(ebitda)             over w as ebitda_ttm,
  sum(net_income)         over w as net_income_ttm,
  sum(pax_total)          over w as pax_ttm,
  sum(movements)          over w as movements_ttm,
  sum(seats)              over w as seats_ttm,
  round(100 * sum(ebitda) over w / nullif(sum(revenue_total) over w, 0), 1)            as ebitda_margin_ttm_pct,
  round(sum(revenue_total) over w     / nullif(sum(pax_total) over w / 2, 0), 2)       as revenue_per_enplaned_ttm,
  round(sum(aero_revenue) over w      / nullif(sum(pax_total) over w / 2, 0), 2)       as aero_per_enplaned_ttm,
  round(sum(commercial_revenue) over w / nullif(sum(pax_total) over w / 2, 0), 2)      as commercial_per_enplaned_ttm,
  round(sum(aif_revenue) over w       / nullif(sum(pax_total) over w / 2, 0), 2)       as aif_per_enplaned_ttm,
  round(sum(opex_before_amort) over w / nullif(sum(pax_total) over w / 2, 0), 2)       as opex_per_enplaned_ttm,
  round(100 * sum(ground_rent) over w / nullif(sum(revenue_total) over w, 0), 1)       as ground_rent_share_ttm_pct,
  round(1000 * sum(seats) over w / nullif(sum(movements) over w, 0), 1)                as seats_per_movement_ttm,
  -- check against the GTAA's published debt per enplaned passenger
  total_debt,
  debt_per_epax                                                                         as debt_per_epax_reported,
  round(total_debt / nullif(sum(pax_total) over w / 2, 0), 0)                          as debt_per_epax_calculated,
  cpe
from quarterly_kpi
window w as (order by period_start rows between 3 preceding and current row);

-- Example: trailing-12-month EBITDA margin and revenue per enplaned passenger, year-ends only
-- select period, revenue_ttm, ebitda_margin_ttm_pct, revenue_per_enplaned_ttm
-- from v_ttm where quarter = 4 or period = '2026Q3' order by period_start;
