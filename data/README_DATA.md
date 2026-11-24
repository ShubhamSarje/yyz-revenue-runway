# Data: collection and tie-out (Phase 1)

Phase 1 is complete: 35 quarters (Q1 2018 to Q3 2026) of Toronto Pearson figures, extracted from the GTAA's own reports and checked against themselves and against StatCan.

## What was collected

| Source | Coverage | Files |
| --- | --- | --- |
| GTAA quarterly and annual MD&A reports | 35 reports, Q1 2018 to Q3 2026 | `raw/gtaa/*.pdf`, manifest `raw/gtaa_reports_manifest.csv` |
| GTAA aeronautical fee schedules | 12 schedules, Jan 2018 to Jan 2027 | `raw/fees/*.pdf`, manifest `raw/fees_manifest.csv` |
| StatCan itinerant movements, Toronto Pearson, by sector | Jan 2018 to Aug 2026 (tables 23-10-0008-01 and 23-10-0302-01) | `raw/statcan/yyz_*.csv` |
| StatCan CPI, all items, Canada and Ontario | Jan 2017 to Oct 2026 (table 18-10-0004-01) | `raw/statcan/cpi_all_items_2017on.csv` |

## Clean outputs

| File | Contents |
| --- | --- |
| `processed/yyz_quarterly.csv` | One row per quarter: revenue by line, costs, EBITDA, net income, passengers, movements, MTOW, seats, load factor, debt, CPE, covenants |
| `processed/yyz_quarterly_sources.csv` | Where every value came from (report, page, or derivation) |
| `processed/statcan_movements_quarterly.csv` | Domestic / transborder / other international movements by quarter, transborder share |
| `processed/cpi_ontario_quarterly.csv` | Quarterly average Ontario CPI |
| `processed/tieout_report.csv` | All 478 checks, pass or fail |

## Rules used

1. **Restated figures first.** Each quarter uses the prior-year column of the following year's report where it exists (the GTAA's own corrected figure); otherwise the original report.
2. **Q4 is derived.** The GTAA's Q4 documents are annual reports, so Q4 = full year minus nine-month year-to-date. The 2021 annual report has a separate Q4 column, which is used directly.
3. **Balance-sheet figures** (debt, CPE, covenants) are period-end values.
4. **Load factor** = passengers / seats; this reproduces the GTAA's published load factor in every non-COVID quarter checked (21 of 21).

## Tie-out results

| Check | Pass | Fail |
| --- | --- | --- |
| Aeronautical = landing fees + terminal charges | 35 | 0 |
| Commercial = concessions + parking + other | 35 | 0 |
| Total revenue = aeronautical + commercial + AIF | 35 | 0 |
| Passengers: domestic + international = total | 35 | 0 |
| EBITDA = revenue - operating costs before amortization | 35 | 0 |
| Four quarters = annual figure (8 years x 7 metrics) | 56 | 0 |
| Load factor = passengers / seats vs reported | 21 | 0 |
| StatCan movements vs GTAA movements | 34 complete quarters within about 1% | 0 |
| Original vs restated (informational) | 177 | 5 (restatements; restated value used) |
| OCR vs restated (informational) | 38 | 4 (OCR errors; restated value used) |

## Issues found and how they were handled

| Issue | Handling |
| --- | --- |
| Q1 2023 report is a scanned image | Text recognition used as a cross-check; values taken from the Q1 2024 report's prior-year column |
| Q3 2021 report has a broken font encoding | Same approach; values from the Q3 2022 report's prior-year column. OCR dropped three-month columns on four revenue rows, confirming why |
| Q2 2024 report prints aircraft movements as "0.1" | Source typo. Used H1 year-to-date minus Q1 = 97.8 thousand, which matches the Q2 2025 report's prior-year column |
| GTAA restated a few figures a year later (2018 movements +0.3 to +0.5 thousand; Q2 2024 EBITDA 237.2 to 240.6) | Restated values used |
| Q3 2021 net debt per enplaned passenger: OCR line includes a footnote marker | Manual override to 1,579 (documented in the build script) |
| CPE is only published from 2023; covenants mainly in annual reports | Shown for the years available; not back-filled |
| StatCan has not published September 2026 | Q3 2026 transborder share uses July and August only; totals not compared |

## Spot values (for a quick sanity check against the press releases)

| Period | Revenue ($M) | Passengers (M) | EBITDA ($M) |
| --- | --- | --- | --- |
| 2019 full year | 1,521.3 | 50.5 | 725.9 |
| 2025 full year | 2,084.8 (sum of quarters 2,084.9, rounding) | 47.3 | 990.2 |
| Q3 2026 | 626.5 | 13.8 | 327.5 |
