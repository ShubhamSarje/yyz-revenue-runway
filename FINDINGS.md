# YYZ Revenue Runway: Findings

**Business question:** Is Toronto Pearson's revenue growth coming from more travellers, or from charging each traveller more?

**Answer:** from charging each traveller more. Between 2019 and 2025 Pearson's revenue grew **$564M (+37%) while passengers fell 6.5%**. Published fee increases explain **57% ($321M)** of that growth. Fewer travellers took **$99M** off the total, and the rest came from earning more per traveller in other ways (bigger planes, traffic mix and passenger spending). Growth in 2026 is more balanced: in the first nine months, volume and price each contributed about half.

> **Headline for the resume:** Toronto Pearson's revenue rose 37% from 2019 to 2025 on 6.5% fewer passengers; a SQL revenue bridge over 35 quarters of GTAA filings traces 57% of the $564M growth to published fee increases.

Independent analysis using public GTAA reports, not affiliated with the GTAA or Toronto Pearson. All dollar figures are Canadian dollars. Page numbers refer to PDF pages of the GTAA reports listed in `data/raw/gtaa_reports_manifest.csv`. "Enplaned passengers" means passengers boarding at Pearson (the GTAA defines this as half of total passengers).

---

## F1. Growth since 2019 came from price, not volume

| Driver, 2025 vs 2019 | $M | Share of change |
| --- | --- | --- |
| Volume (6.5% fewer passengers) | −99.2 | −18% |
| Published fee increases (aeronautical rates, AIF) | +321.1 | 57% |
| Other per-passenger gains (aircraft size, mix, spending) | +388.0 | 69% |
| Interaction | −46.2 | −8% |
| **Total revenue change** | **+563.6** | 100% |

- Revenue: $1,521.3M (2019) → $2,084.8M (2025, as reported; quarters sum to $2,084.9M). Passengers: 50.6M → 47.3M.
- **First nine months of 2026 vs 2025:** revenue +$145.2M, with volume +$65.7M (45%), published price +$70.8M (49%) and other per-passenger +$5.4M. As traffic recovers, growth is shifting back towards volume.

**Evidence:** `sql/05_revenue_bridge.sql` (view `v_revenue_bridge`), queries F1 and F1b in `sql/07_findings.sql`. Revenue and passengers come from the 2019 and 2025 annual MD&As and the Q3 2026 MD&A (p.6).

**Verdict:** supported.

## F2. The hub paradox: connecting growth pays a quarter of the fee

- Connecting passengers pay a **$10** improvement fee at Pearson; passengers starting or ending their trip pay **$40** (2026 rates).
- In the first nine months of 2026, connecting passengers grew **15.0%** (8.0M → 9.2M) while origin-and-destination passengers grew **1.1%** (27.8M → 28.1M). **About 80% of passenger growth (1.2M of 1.5M) was connecting traffic.**
- The connecting share rose from **22.2% to 24.6%**. At 2026 rates, that shift cost an estimated **$13.4M of AIF** in nine months, before airline collection fees.
- The same mechanism ran in reverse earlier. The connecting share fell from 27.1% (2022) to 22.0% (2025), which is why AIF revenue per passenger rose faster than the posted rate in those years.
- The GTAA's own Q3 2026 MD&A (p.11) attributes part of the AIF result to a shift in passenger mix towards connecting passengers.

| Year | Connecting share | AIF per enplaned passenger | Local AIF rate |
| --- | --- | --- | --- |
| 2022 | 27.1% | $23.20 | $30 |
| 2023 | 23.1% | $27.39 | $35 |
| 2024 | 22.3% | $28.82 | $35 |
| 2025 | 22.0% | $30.23 | $37 |
| 9M 2026 | 24.6% | $31.95 | $40 |

**Evidence:** table `passenger_mix` (`data/processed/passenger_mix.csv`) with the passenger-mix tables from the MD&As (2023Q4 p.9, 2024Q4 p.7, 2025Q4 p.7, 2026Q3 p.8); queries F2 and F2b in `sql/07_findings.sql`.

**Verdict:** supported for 2026. The connecting share is the single biggest swing factor in AIF revenue per passenger.

## F3. The US-flight decline is real, but small in revenue terms

- Transborder (US) aircraft movements: **179,322 (2019) → 157,151 (2024) → 151,191 (2025)**. That's −3.8% year over year and −15.7% vs 2019. The first half of 2026 fell another 3.9%.
- The US share of itinerant movements slipped from about 40% to **38.7% (2025)** and 37.9% (first half of 2026).
- **Revenue at risk from the 2025 decline: about $5–16M a year (0.3%–0.8% of revenue).** This assumes a US flight earns half an average flight's revenue, because US routes use smaller aircraft. The low end counts aeronautical fees only; the high end counts all revenue streams.
- The GTAA's 2025 MD&As cite lower transborder traffic as the reason the international sector was flat or down (Q1 2025 p.7, Q2 2025 p.7, Q3 2025 p.7).

**Evidence:** StatCan tables 23-10-0008-01 and 23-10-0302-01 (`data/processed/statcan_movements_quarterly.csv`); query F3 in `sql/07_findings.sql`.

**Verdict:** the decline is confirmed, but the revenue impact is modest. Domestic and international growth more than offset it. Q3 2026 is excluded because StatCan has not yet published September 2026.

## F4. Twelve cents of every new dollar goes to ground rent

- Ground rent rose **$65.2M** from 2019 to 2025, **11.6%** of the $563.6M revenue increase. Outside COVID it has run at 11.0%–11.3% of revenue every year since 2018.
- Ground rent is charged as a sliding percentage of airport revenue, with a top rate of 12% above $250M (Q3 2026 MD&A p.12). At Pearson's scale, about **12 cents of each additional revenue dollar** goes to the federal government before any operating cost.
- During COVID, federal rent relief cut ground rent to $15.6M (2020) and $64.8M (2021). Q4 2020 shows a net credit.

**Evidence:** query F4 in `sql/07_findings.sql`; `ground_rent_share_ttm_pct` in `v_ttm`.

**Verdict:** supported.

## F5. After inflation, the real gains came from fees, not passenger spending

Per enplaned passenger, 2019 vs 2025:

| Revenue line | 2019 | 2025 nominal | 2025 in 2019 dollars | Real change |
| --- | --- | --- | --- | --- |
| Total revenue | $60.13 | $88.16 | $73.21 | **+21.8%** |
| Aeronautical (= CPE) | $20.46 | $29.94 | $24.87 | +21.6% |
| AIF | $17.71 | $30.23 | $25.11 | +41.8% |
| Commercial (parking, shops, rentals) | $21.96 | $27.98 | $23.24 | **+5.8%** |

Commercial revenue per traveller barely beat inflation. Most of the real increase came from the two fee lines.

**Evidence:** query F5 in `sql/07_findings.sql`; Ontario CPI from StatCan table 18-10-0004-01 (deflator: 2019 = 1.000, 2025 = 1.204).

**Verdict:** supported. This is the "nominal growth that isn't real" check: total revenue per traveller grew 47% in dollars, but 22% after inflation.

## F6. Airline cost per passenger rose twice as fast as the headline rate increases

- The GTAA's published CPE equals aeronautical revenue per enplaned passenger: $30.22 vs $30.3 reported (2023), $28.49 vs $28.5 (2024), $29.94 vs $29.9 (2025). That let us **rebuild CPE back to 2019: about $20.46**, before the GTAA started publishing it.
- CPE rose **+46% (2019 → 2025)**, while the published aeronautical rate increases compound to **+20.5%**, about the same as inflation (+20.4%). Aeronautical revenue per tonne of aircraft weight rose 42% ($13.45 → $19.09), so heavier aircraft per passenger don't explain the gap.
- The extra increase sits in charges outside the headline commercial rate, such as apron fees, the de-icing facility fee ($1.62 → $2.41 per tonne between the 2019 and 2026 schedules) and business and general aviation fees, plus changes in rebates. The public data doesn't split these out.
- Since 2023, CPE has **fallen** in real terms ($26.18 → $24.87 in 2019 dollars).

**Evidence:** query F5/F6 in `sql/07_findings.sql`; `cpe` vs `aero_per_enplaned_ttm` in `v_ttm`; fee schedules in `data/processed/fee_rates.csv`.

**Verdict:** supported for 2019–2025, reversing since 2023.

## F7 (not in the charter). Higher revenue per traveller paid for higher costs, not wider margins

- Operating cost per enplaned passenger: $31.44 (2019) → $46.29 (2025). That's **+22.3% in real terms**, matching the +21.8% real rise in revenue per traveller.
- EBITDA margin: **47.7% (2019) vs 47.5% (2025)**. The extra revenue per traveller funded cost growth rather than expanding the margin.

**Evidence:** query F5 in `sql/07_findings.sql`; `ebitda_margin_ttm_pct` in `v_ttm` (it matches the GTAA's reported 47.5% for 2025).

---

## What this means for revenue leadership

1. **Price has done most of the work; volume now has to.** Fee increases drove 57% of growth since 2019. In 2026, for the first time, volume is contributing as much as price. With CPE near $30 and airlines watching costs, future plans should rely less on rate increases.
2. **Put a number on mix in every AIF forecast.** At 2026 rates, each one-point rise in the connecting share costs about **$7M of AIF a year** (23.65M enplaned passengers × 1% × $30), before collection fees. Hub growth is good for the network but dilutes AIF revenue per passenger.
3. **The US slowdown is a watch item, not a revenue crisis.** It's under 1% of revenue at risk. It matters more for network strategy than for this year's budget.
4. **The next lever is cost.** Margins haven't moved since 2019, and cost per traveller rose 22% in real terms. Cost discipline would show up in the margin faster than another rate increase would.

## Limitations

- **Estimates:** the revenue-at-risk range (F3), the AIF given up through mix (F2) and the CPE back-cast for 2019–2022 (F6) are derived, not reported. Each assumption is stated above.
- **Published price effect:** this uses the GTAA's stated annual change in aeronautical rates and the posted local AIF rate. Fees not covered by the stated change fall into "other per passenger".
- **COVID:** 2020–2021 are shown but excluded from comparisons; Q1 2022 (Omicron) is flagged.
- **Passenger mix:** O&D vs connecting figures are the GTAA's estimates based on airline reporting, and are published only from 2021.
- **Rounding:** passengers are published to 0.1M, so per-passenger values in small quarters move with rounding.

## Reproduce

Phases 1–3 as in the [README](README.md), then run `sql/07_findings.sql`. Source traceability for every input value: `data/processed/yyz_quarterly_sources.csv`.
