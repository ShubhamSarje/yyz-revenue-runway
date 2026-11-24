-- YYZ Revenue Runway: 02 load checks (run after 01_schema.sql and 01b_seed_data.sql)
-- Row counts and annual totals compared with the GTAA's annual reports.

select 'rows' as check_name, count(*)::text as result, '35 expected' as expected from quarterly_kpi
union all
select 'first / last quarter', min(period) || ' / ' || max(period), '2018Q1 / 2026Q3' from quarterly_kpi
union all
select 'revenue 2019 ($M)', sum(revenue_total)::text, '1,521.3 (2019 annual report)' from quarterly_kpi where year = 2019
union all
select 'revenue 2025 ($M)', sum(revenue_total)::text, '2,084.8 (2025 annual report; 0.1 rounding)' from quarterly_kpi where year = 2025
union all
select 'passengers 2025 (M)', sum(pax_total)::text, '47.3' from quarterly_kpi where year = 2025
union all
select 'revenue 9M 2026 ($M)', sum(revenue_total)::text, '1,715.6 (Q3 2026 report; 0.1 rounding)' from quarterly_kpi where year = 2026
union all
select 'fee schedules', count(*)::text, '12' from fee_rates;

-- Row-level security is on for all tables (API access closed; query through SQL only)
alter table quarterly_kpi enable row level security;
alter table fee_rates enable row level security;
alter table fee_changes enable row level security;
