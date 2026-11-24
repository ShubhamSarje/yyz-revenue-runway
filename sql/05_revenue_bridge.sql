-- YYZ Revenue Runway: 05 revenue bridge (volume vs rate)
--
-- The business question in one view: how much of a revenue change came from MORE TRAVELLERS
-- and how much from MORE REVENUE PER TRAVELLER?
--
-- Method (per revenue stream s = aeronautical, commercial, AIF), with P = enplaned passengers
-- and r = revenue per enplaned passenger, comparing a current period (1) with a base period (0):
--     revenue change = volume + rate + interaction                       (exact, adds up)
--     volume      = (P1 - P0) * r0          more or fewer travellers, at the old revenue per traveller
--     rate        = (r1 - r0) * P0          more or less revenue per traveller, on the old traffic
--     interaction = (P1 - P0) * (r1 - r0)   both moving together
--   The rate effect is split further:
--     published_price = R0 * (k - 1)        k = ratio of published rates (aeronautical rate index; AIF local rate)
--     other_per_pax   = rate - published_price
--                                            bigger planes, traffic mix, rebates, connecting share,
--                                            and (for commercial, which has no posted rate) all spend per traveller
--
-- Comparisons
--   grain 'quarter': each quarter vs the same quarter a year earlier, and vs the same quarter of 2019
--   grain 'year':    each year vs the previous year and vs 2019, on the SAME quarters
--                    (2026 = Q1-Q3, compared with Q1-Q3 of the base year)
--
-- What this teaches
--   A self-join (quarterly_kpi c JOIN quarterly_kpi b) to pair each period with its comparison period
--   CROSS JOIN LATERAL (VALUES ...) to unpivot three revenue streams into rows, so the bridge
--   formula is written once instead of three times
--
-- Output: view v_revenue_bridge (one row per grain x period x comparison x stream, plus a 'total' row)

create or replace view v_revenue_bridge with (security_invoker = true) as
with pairs as (
  -- quarter vs same quarter one year earlier
  select 'quarter'::text as grain, c.period as label, 'vs prior year'::text as comparison, c.period as cur_p, b.period as base_p
  from quarterly_kpi c join quarterly_kpi b on b.quarter = c.quarter and b.year = c.year - 1
  union all
  -- quarter vs same quarter of 2019
  select 'quarter', c.period, 'vs 2019', c.period, b.period
  from quarterly_kpi c join quarterly_kpi b on b.quarter = c.quarter and b.year = 2019
  where c.year > 2019
  union all
  -- year vs previous year, same quarters
  select 'year', c.year::text, 'vs prior year', c.period, b.period
  from quarterly_kpi c join quarterly_kpi b on b.quarter = c.quarter and b.year = c.year - 1
  union all
  -- year vs 2019, same quarters
  select 'year', c.year::text, 'vs 2019', c.period, b.period
  from quarterly_kpi c join quarterly_kpi b on b.quarter = c.quarter and b.year = 2019
  where c.year > 2019
),
agg as (
  select
    p.grain, p.label, p.comparison,
    min(b.year) as base_year,
    string_agg('Q' || c.quarter, '+' order by c.quarter) as quarters_covered,
    bool_or(c.covid_period or b.covid_period) as involves_covid,
    sum(c.enplaned_pax) as p1, sum(b.enplaned_pax) as p0,
    sum(c.aero_revenue) as aero1, sum(b.aero_revenue) as aero0,
    sum(c.commercial_revenue) as comm1, sum(b.commercial_revenue) as comm0,
    sum(c.aif_revenue) as aif1, sum(b.aif_revenue) as aif0,
    avg(c.aero_rate_index) / avg(b.aero_rate_index) as k_aero,
    avg(c.aif_local) / avg(b.aif_local) as k_aif
  from pairs p
  join quarterly_kpi c on c.period = p.cur_p
  join quarterly_kpi b on b.period = p.base_p
  group by p.grain, p.label, p.comparison
),
streams as (
  select a.grain, a.label, a.comparison, a.base_year, a.quarters_covered, a.involves_covid,
         a.p0, a.p1, s.stream, s.r_total0, s.r_total1, s.k
  from agg a
  cross join lateral (values
    ('aeronautical', a.aero0, a.aero1, a.k_aero),
    ('commercial',   a.comm0, a.comm1, null::numeric),
    ('aif',          a.aif0,  a.aif1,  a.k_aif)
  ) as s(stream, r_total0, r_total1, k)
),
bridge as (
  select *,
    r_total0 / p0 as r0,
    r_total1 / p1 as r1,
    (p1 - p0) * (r_total0 / p0)                         as volume_effect,
    (r_total1 / p1 - r_total0 / p0) * p0                as rate_effect,
    (p1 - p0) * (r_total1 / p1 - r_total0 / p0)         as interaction_effect,
    coalesce(r_total0 * (k - 1), 0)                     as published_price_effect
  from streams
),
by_stream as (
  select grain, label, comparison, base_year, quarters_covered, involves_covid, stream,
    round(r_total0, 1) as revenue_base,
    round(r_total1, 1) as revenue_current,
    round(r_total1 - r_total0, 1) as revenue_change,
    round(p0, 2) as enplaned_base, round(p1, 2) as enplaned_current,
    round(r0, 2) as rev_per_enplaned_base, round(r1, 2) as rev_per_enplaned_current,
    round(volume_effect, 1) as volume_effect,
    round(rate_effect, 1) as rate_effect,
    round(published_price_effect, 1) as published_price_effect,
    round(rate_effect - published_price_effect, 1) as other_per_pax_effect,
    round(interaction_effect, 1) as interaction_effect
  from bridge
)
select * from by_stream
union all
select grain, label, comparison, base_year, quarters_covered, involves_covid, 'total' as stream,
  sum(revenue_base), sum(revenue_current), sum(revenue_change),
  max(enplaned_base), max(enplaned_current),
  round(sum(revenue_base) / max(enplaned_base), 2), round(sum(revenue_current) / max(enplaned_current), 2),
  sum(volume_effect), sum(rate_effect), sum(published_price_effect), sum(other_per_pax_effect), sum(interaction_effect)
from by_stream
group by grain, label, comparison, base_year, quarters_covered, involves_covid;

-- Headline: 2025 vs 2019, and the first nine months of 2026 vs the same nine months of 2025
-- select label, comparison, stream, revenue_change, volume_effect, published_price_effect, other_per_pax_effect, interaction_effect
-- from v_revenue_bridge where grain = 'year' and ((label = '2025' and comparison = 'vs 2019') or (label = '2026' and comparison = 'vs prior year'))
-- order by label, stream;
