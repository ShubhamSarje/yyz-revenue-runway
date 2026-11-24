# SQL model (Phase 3): PostgreSQL on Supabase

Run in order in the Supabase SQL editor (or any PostgreSQL 15+):

| File | What it does | SQL technique |
| --- | --- | --- |
| `01_schema.sql` | Tables `quarterly_kpi` (35 quarters x 75 columns), `fee_rates`, `fee_changes` | DDL |
| `01b_seed_data.sql` | Loads the Phase 2 outputs (generated from `data/processed/*.csv`) | INSERT |
| `02_load_checks.sql` | Row counts and annual totals vs the GTAA's annual reports; turns on row-level security | UNION ALL checks |
| `03_yoy_and_vs2019.sql` | View `v_quarterly_changes`: year-over-year and vs-2019 changes, same quarter | `LAG() OVER (PARTITION BY quarter ORDER BY year)`, windowed `MAX(CASE ...)` |
| `04_trailing_12_months.sql` | View `v_ttm`: rolling four-quarter totals, margins and per-passenger values | window frame `ROWS BETWEEN 3 PRECEDING AND CURRENT ROW`, `BOOL_OR`, named `WINDOW` |
| `05_revenue_bridge.sql` | View `v_revenue_bridge`: revenue change split into volume, published price, other per passenger, interaction | self-join, `CROSS JOIN LATERAL (VALUES ...)` unpivot |
| `06_reconciliation.sql` | Control totals for the Phase 3 checkpoint | aggregates over views |

## Revenue bridge method

Revenue = enplaned passengers (P) x revenue per enplaned passenger (r), per stream (aeronautical, commercial, AIF):

- **volume** = (P1 - P0) x r0
- **rate** = (r1 - r0) x P0, split into **published price** = R0 x (k - 1), where k = ratio of published rates (aeronautical rate index; AIF local rate), and **other per passenger** = rate - published price (bigger planes, traffic mix, rebates, connecting share, commercial spend)
- **interaction** = (P1 - P0) x (r1 - r0)

The parts add up to the revenue change exactly (largest rounding residual: $0.2M on summed total rows).

## Checkpoint results

**SQL vs Python:** `scripts/05_reconcile_sql.py` recomputes 13 control totals with independent pandas code (`shift`, `rolling`, merges). All 13 match (`data/processed/reconciliation.csv`).

**External check:** `v_ttm` recomputes the GTAA's published debt per enplaned passenger from trailing-12-month traffic. It matches within $1 in every complete window outside COVID; the three 2021 windows differ by $10-17 because quarterly traffic of 0.5-1.7M passengers is published rounded to 0.1M.

## Headline results (to be tested further in Phase 4)

| Comparison | Revenue change | Volume | Published price | Other per passenger | Interaction |
| --- | --- | --- | --- | --- | --- |
| 2025 vs 2019 | +$563.6M | -$99.2M | +$321.1M | +$388.0M | -$46.2M |
| 9M 2026 vs 9M 2025 | +$145.2M | +$65.7M | +$70.8M | +$5.4M | +$3.2M |
