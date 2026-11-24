# YYZ Revenue Runway

**Toronto Pearson Revenue & Operations Dashboard**

> Work in progress: data, SQL model and findings are complete; the interactive web app is being built.

**Answer:** Toronto Pearson's revenue rose **37% from 2019 to 2025 on 6.5% fewer passengers**. A SQL revenue bridge traces **57% of the $564M growth to published fee increases**. Full findings: [FINDINGS.md](FINDINGS.md).

**Business question:** Is Toronto Pearson's revenue growth coming from more travellers, or from charging each traveller more?

Independent analysis using public GTAA reports, not affiliated with the GTAA or Toronto Pearson.

## Status

| Phase | Status |
| --- | --- |
| 0. Charter | Done |
| 1. Data collection and tie-out | Done: 35 quarters (Q1 2018 to Q3 2026), see [data/README_DATA.md](data/README_DATA.md) |
| 2. Python cleaning and derived KPIs | Done: fee rates, CPI adjustment, per-unit KPIs ([notebook](notebooks/01_clean_and_explore.ipynb)) |
| 3. SQL model (PostgreSQL) | Done: YoY / vs-2019 (LAG), trailing 12 months (window frames), revenue bridge; reconciled to Python ([sql/README.md](sql/README.md)) |
| 4. Analysis and findings | Done: six hypotheses tested, headline and recommendations in [FINDINGS.md](FINDINGS.md) |
| 5. Web app (React + Vite) | Built: eight pages in `web/`, private preview in review |
| 6. Publish (Vercel, LinkedIn) | Next |
| 6. Publish | Planned |

## Reproduce

```bash
python scripts/00_download_and_text.py   # GTAA reports + fee schedules, text extraction (OCR for 2 reports)
python scripts/00b_statcan.py            # StatCan movements and CPI
python scripts/01_extract_gtaa.py        # extract every table value with source page and self-check
python scripts/02_build_quarterly.py     # one row per quarter + tie-out checks
python scripts/03_statcan_quarterly.py   # StatCan quarterly roll-up and cross-check
python scripts/04_fee_rates.py           # fee schedule rates + stated annual % changes
# then run notebooks/01_clean_and_explore.ipynb  -> data/processed/kpi_quarterly.csv
# Phase 3: run sql/01 ... sql/06 in PostgreSQL (see sql/README.md), then:
python scripts/05_reconcile_sql.py       # independent pandas recalculation of the SQL control totals
# Phase 5: export the views to the app and run it
DATABASE_URL=postgresql://... python scripts/06_export_app_data.py   # -> web/public/data/app_data.json
cd web && npm install && npm run dev
```

Photos: three photos taken at Toronto Pearson, from Unsplash (Unsplash License), credited on each image and on the Methodology page.

Data sources: Greater Toronto Airports Authority quarterly and annual MD&A reports and aeronautical fee schedules; Statistics Canada tables 23-10-0008-01, 23-10-0302-01 and 18-10-0004-01 (Statistics Canada Open Licence).
