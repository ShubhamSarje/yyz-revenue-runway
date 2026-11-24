-- YYZ Revenue Runway: 07 findings (Phase 4)
-- One query per hypothesis in the charter. Every number in FINDINGS.md comes from one of these.
-- passenger_mix (O&D vs connecting) is loaded from the GTAA MD&A tables; see data/processed/passenger_mix.csv.

create table if not exists passenger_mix (
  period_label text primary key, period_type text, od_pax_m numeric, connecting_pax_m numeric,
  total_pax_m numeric, connecting_share_pct numeric, source text
);
alter table passenger_mix enable row level security;
-- (rows: see data/processed/passenger_mix.csv, inserted by migration 07_passenger_mix)

-- F1  Price vs volume: the 2025 vs 2019 bridge, and 9M 2026 vs 9M 2025
select label, comparison, stream, revenue_base, revenue_current, revenue_change,
       volume_effect, published_price_effect, other_per_pax_effect, interaction_effect,
       round(100 * published_price_effect / nullif(revenue_change, 0), 1) as price_share_of_change_pct
from v_revenue_bridge
where grain = 'year'
  and ((label = '2025' and comparison = 'vs 2019') or (label = '2026' and comparison = 'vs prior year'))
order by label, case stream when 'total' then 9 else 1 end, stream;

-- F1b Revenue and passenger change, 2025 vs 2019
select sum(revenue_total) filter (where year = 2025) as revenue_2025,
       sum(revenue_total) filter (where year = 2019) as revenue_2019,
       round(100 * (sum(revenue_total) filter (where year = 2025) / sum(revenue_total) filter (where year = 2019) - 1), 1) as revenue_change_pct,
       sum(pax_total) filter (where year = 2025) as pax_2025,
       sum(pax_total) filter (where year = 2019) as pax_2019,
       round(100 * (sum(pax_total) filter (where year = 2025) / sum(pax_total) filter (where year = 2019) - 1), 1) as pax_change_pct
from quarterly_kpi;

-- F2  Hub paradox: connecting share, AIF yield, and the AIF given up when the mix shifts
--     AIF forgone (gross, before airline collection fees) = enplaned pax x change in connecting share x (local rate - connecting rate)
with m as (
  select period_label, connecting_share_pct, connecting_pax_m, od_pax_m, total_pax_m from passenger_mix
),
nine as (
  select sum(enplaned_pax) as enplaned_9m_2026, avg(aif_local) as aif_local, avg(aif_connecting) as aif_conn
  from quarterly_kpi where year = 2026
)
select
  (select connecting_share_pct from m where period_label = '9M 2025') as connecting_share_9m_2025,
  (select connecting_share_pct from m where period_label = '9M 2026') as connecting_share_9m_2026,
  (select connecting_pax_m from m where period_label = '9M 2026') - (select connecting_pax_m from m where period_label = '9M 2025') as connecting_growth_m,
  (select total_pax_m from m where period_label = '9M 2026') - (select total_pax_m from m where period_label = '9M 2025') as total_growth_m,
  round(100 * ((select connecting_pax_m from m where period_label = '9M 2026') - (select connecting_pax_m from m where period_label = '9M 2025'))
            / ((select total_pax_m from m where period_label = '9M 2026') - (select total_pax_m from m where period_label = '9M 2025')), 0) as connecting_share_of_growth_pct,
  round(n.enplaned_9m_2026 * ((select connecting_share_pct from m where period_label = '9M 2026')
                            - (select connecting_share_pct from m where period_label = '9M 2025')) / 100 * (n.aif_local - n.aif_conn), 1) as aif_forgone_gross_musd
from nine n;

-- F2b AIF yield vs connecting share by year (yield = AIF per enplaned passenger / local AIF rate)
select k.year, round(sum(aif_revenue) / sum(enplaned_pax), 2) as aif_per_enplaned, avg(aif_local) as aif_local,
       round(sum(aif_revenue) / sum(enplaned_pax) / avg(aif_local), 3) as aif_yield_ratio, m.connecting_share_pct
from quarterly_kpi k left join passenger_mix m on m.period_label = k.year::text
where k.year >= 2021 group by k.year, m.connecting_share_pct order by k.year;

-- F3  US-flight exposure: transborder movements and a revenue-at-risk range
--     Assumption: a US flight earns half of an average flight's revenue (smaller aircraft).
--     Low = aeronautical revenue only; high = all revenue streams.
with y as (
  select year, sum(transborder_movements) tb, sum(itinerant_movements) it,
         sum(aero_revenue) aero, sum(revenue_total) rev, sum(movements) mov
  from quarterly_kpi where statcan_complete_quarter group by year
)
select a.year, a.tb as transborder_movements, round(100.0 * a.tb / a.it, 1) as transborder_share_pct,
       a.tb - b.tb as change_vs_prior_year, a.tb - c.tb as change_vs_2019,
       round(100.0 * (a.tb::numeric / b.tb - 1), 1) as yoy_pct, round(100.0 * (a.tb::numeric / c.tb - 1), 1) as vs2019_pct,
       round((b.tb - a.tb) * 0.5 * a.aero / a.mov / 1000, 1) as revenue_at_risk_low_musd,
       round((b.tb - a.tb) * 0.5 * a.rev  / a.mov / 1000, 1) as revenue_at_risk_high_musd,
       round(100 * (b.tb - a.tb) * 0.5 * a.rev / a.mov / 1000 / a.rev, 2) as high_as_pct_of_revenue
from y a join y b on b.year = a.year - 1 join y c on c.year = 2019
where a.year in (2024, 2025) order by a.year;

-- F4  Ground rent: share of revenue and share of the revenue increase since 2019
select sum(ground_rent) filter (where year = 2025) - sum(ground_rent) filter (where year = 2019) as ground_rent_increase,
       sum(revenue_total) filter (where year = 2025) - sum(revenue_total) filter (where year = 2019) as revenue_increase,
       round(100 * (sum(ground_rent) filter (where year = 2025) - sum(ground_rent) filter (where year = 2019))
                 / (sum(revenue_total) filter (where year = 2025) - sum(revenue_total) filter (where year = 2019)), 1) as share_of_increase_pct,
       round(100 * sum(ground_rent) filter (where year = 2025) / sum(revenue_total) filter (where year = 2025), 1) as share_2025_pct
from quarterly_kpi;

-- F5  Real vs nominal (2019 dollars) and F6 CPE: per-enplaned-passenger values, 2019 vs 2025
--     CPE = aeronautical revenue / enplaned passengers (reproduces the GTAA's published CPE for 2023-2025)
with y as (
  select year, sum(revenue_total) rev, sum(aero_revenue) aero, sum(commercial_revenue) comm, sum(aif_revenue) aif,
         sum(opex_before_amort) opex, sum(ebitda) ebitda, sum(enplaned_pax) e, sum(mtow) mtow,
         avg(deflator_2019) d, avg(aero_rate_index) idx, max(cpe) filter (where quarter = 4) cpe_reported
  from quarterly_kpi group by year
)
select year,
  round(rev / e, 2) rev_pp, round(rev / e / d, 2) rev_pp_real,
  round(aero / e, 2) cpe_calc, cpe_reported, round(aero / e / d, 2) cpe_real,
  round(comm / e, 2) comm_pp, round(comm / e / d, 2) comm_pp_real,
  round(aif / e, 2) aif_pp, round(aif / e / d, 2) aif_pp_real,
  round(opex / e, 2) opex_pp, round(opex / e / d, 2) opex_pp_real,
  round(100 * ebitda / rev, 1) ebitda_margin_pct,
  round(aero / mtow, 2) aero_per_tonne, round(idx, 1) aero_rate_index, round(d, 3) deflator
from y where year in (2019, 2023, 2024, 2025) order by year;
