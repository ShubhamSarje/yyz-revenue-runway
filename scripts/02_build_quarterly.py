"""Phase 1: assemble one row per quarter (Q1 2018 - Q3 2026) from the extracted report values,
then run the tie-out checks.

Rules
- Q1-Q3: the three-month column of that quarter's own report.
- Q4: the GTAA's Q4 documents are annual reports. Where the annual report shows a separate
  three-month Q4 column (2021) we use it; otherwise Q4 = full year - nine months year-to-date
  (from the Q3 report). Balance-sheet style metrics (debt, CPE, covenants) are year-end values.
- Q1 2023: the report is a scanned image. Values come from the prior-year column of the Q1 2024
  report (text-native); the OCR values are kept as a cross-check.
- Load factor = passengers / seats (matches the GTAA's published figures); Q4 is derived that way.

Outputs
- data/processed/yyz_quarterly.csv      clean wide table, one row per quarter
- data/processed/yyz_quarterly_sources.csv  where each value came from
- data/processed/tieout_report.csv      every check, pass/fail
"""
import os, pandas as pd, numpy as np

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, 'data', 'raw')
OUT = os.path.join(BASE, 'data', 'processed')
os.makedirs(OUT, exist_ok=True)

d = pd.read_csv(os.path.join(RAW, 'gtaa_extract_long.csv'))
d['value'] = pd.to_numeric(d['value'], errors='coerce')
for c in ('prior', 'ytd', 'ytd_prior'):
    d[c] = pd.to_numeric(d[c], errors='coerce')

FLOW = ['revenue_total', 'landing_fees', 'general_terminal', 'aero_revenue', 'concessions_rentals',
        'parking_ground', 'other_revenue', 'commercial_revenue', 'aif_revenue', 'ground_rent', 'pilt',
        'goods_services', 'salaries', 'ebitda', 'net_income', 'pax_domestic', 'pax_international',
        'pax_total', 'movements', 'mtow', 'seats']
STOCK = ['total_debt', 'net_debt', 'debt_per_epax', 'net_debt_per_epax', 'cpe',
         'operating_covenant', 'debt_service_covenant']

get = lambda p, m, col='value': d.loc[(d.period == p) & (d.metric == m), col].squeeze() \
    if not d.loc[(d.period == p) & (d.metric == m)].empty else np.nan
page = lambda p, m: d.loc[(d.period == p) & (d.metric == m), 'page'].squeeze()

periods = [f'{y}Q{q}' for y in range(2018, 2027) for q in range(1, 5)][:35]
rows, src = [], []

OCR_REPORTS = {'2021Q3', '2023Q1'}   # scanned / broken-font reports: never used as a restatement source
TYPO_LINES = {('2024Q2', 'movements')}  # source prints 0.1 for three-month movements
SUSPECT = []

# manual corrections, each documented
OVERRIDES = {
    ('2021Q3', 'net_debt_per_epax'): (1579.0, 'OCR line "Net Debt 4/Enplaned Passenger 5 1,579 537": 5 is a footnote marker'),
}

def restated(p, m, col_cur='value'):
    """Value for period p as shown in the following year's report (restated comparative)."""
    y, qq = int(p[:4]), int(p[-1])
    nxt = f'{y + 1}Q{qq}'
    if nxt not in periods or nxt in OCR_REPORTS or (nxt, m) in TYPO_LINES or (qq == 4 and col_cur == 'value'):
        return np.nan
    v = get(nxt, m, {'value': 'prior', 'ytd': 'ytd_prior'}[col_cur])
    o = get(p, m, col_cur)
    okline = d.loc[(d.period == p) & (d.metric == m), 'self_check'].squeeze()
    if p not in OCR_REPORTS and not pd.isna(o) and not pd.isna(v) and o != 0 \
            and abs(v - o) / abs(o) > 0.10 and okline == 'ok':
        SUSPECT.append(dict(period=p, metric=m, original=o, restated=v))
        return np.nan   # large 'restatement' vs a self-consistent original: keep original, flag
    return v


def pick(p, m, col='value'):
    """Restated first, original report as fallback. Returns (value, source)."""
    r = restated(p, m, col)
    if not pd.isna(r):
        y, qq = int(p[:4]), int(p[-1])
        return r, f'{y + 1}Q{qq} report, prior-year column (restated)'
    o = get(p, m, col)
    return o, f'{p} report p.{page(p, m)}'


for p in periods:
    y, q = int(p[:4]), int(p[-1])
    r = {'period': p, 'year': y, 'quarter': q}
    for m in FLOW + STOCK + ['load_factor']:
        if (p, m) in OVERRIDES:
            v, how = OVERRIDES[(p, m)][0], 'override: ' + OVERRIDES[(p, m)][1]
        elif q < 4:
            v, how = pick(p, m)
            if p == '2024Q2' and m == 'movements':   # source typo: report prints 0.1
                v = round(get(p, m, 'ytd') - get('2024Q1', m), 1)
                how = 'derived: H1 2024 YTD - Q1 2024 (Q2 2024 report prints 0.1, a source typo)'
        else:
            if m in STOCK:
                v, how = get(p, m, 'ytd'), f'{p} annual report p.{page(p, m)} (year-end)'
                if pd.isna(v):
                    v, how = get(p, m), f'{p} annual report p.{page(p, m)}'
            elif m == 'load_factor':
                v, how = np.nan, 'derived later: passengers / seats'
            else:
                fy, fys = pick(p, m, 'ytd')
                m9, m9s = pick(f'{y}Q3', m, 'ytd')
                q4 = get(p, m)
                if not pd.isna(q4) and pd.isna(restated(p, m)):
                    v, how = q4, f'{p} annual report (Q4 column)'
                else:
                    v = round(fy - m9, 1) if not (pd.isna(fy) or pd.isna(m9)) else np.nan
                    how = f'derived: FY [{fys}] - 9M YTD [{m9s}]'
        orig = get(p, m) if q < 4 else np.nan
        r[m] = v
        src.append(dict(period=p, metric=m, value=v, original_report_value=orig, source=how))
    rows.append(r)

q = pd.DataFrame(rows)
pd.DataFrame(SUSPECT).to_csv(os.path.join(OUT, 'restatement_flags.csv'), index=False)
print('large restatements kept as original:', SUSPECT)

# derived columns
q['opex_before_amort'] = q[['ground_rent', 'pilt', 'goods_services', 'salaries']].sum(axis=1, min_count=4).round(1)
q['load_factor_derived'] = (q['pax_total'] / q['seats'] * 100).round(1)
q['load_factor'] = q['load_factor'].fillna(q['load_factor_derived'])
q['ebitda_margin'] = (q['ebitda'] / q['revenue_total'] * 100).round(1)
# reported load factor / ebitda margin for Q1-Q3 kept for comparison
q['ebitda_margin_reported'] = [get(p, 'ebitda_margin') if p[-1] != '4' else np.nan for p in q.period]
q['covid_period'] = q.year.isin([2020, 2021])

q.to_csv(os.path.join(OUT, 'yyz_quarterly.csv'), index=False)
pd.DataFrame(src).to_csv(os.path.join(OUT, 'yyz_quarterly_sources.csv'), index=False)

# ---------------- tie-out checks ----------------
checks = []
def add(check, p, expected, actual, tol, note=''):
    ok = (not pd.isna(expected)) and (not pd.isna(actual)) and abs(expected - actual) <= tol
    checks.append(dict(check=check, period=p, expected=expected, actual=actual,
                       diff=None if pd.isna(expected) or pd.isna(actual) else round(actual - expected, 2),
                       tolerance=tol, result='pass' if ok else 'FAIL', note=note))

for _, r in q.iterrows():
    p = r.period
    add('aero = landing + terminal', p, r.landing_fees + r.general_terminal, r.aero_revenue, 0.25)
    add('commercial = concessions + parking + other', p,
        r.concessions_rentals + r.parking_ground + r.other_revenue, r.commercial_revenue, 0.35)
    add('total revenue = aero + commercial + AIF', p,
        r.aero_revenue + r.commercial_revenue + r.aif_revenue, r.revenue_total, 0.35)
    add('passengers: domestic + international = total', p, r.pax_domestic + r.pax_international, r.pax_total, 0.15)
    add('EBITDA = revenue - opex before amortization', p, r.revenue_total - r.opex_before_amort, r.ebitda, 1.0,
        'GTAA EBITDA may include small other items')
    if r.quarter < 4 and not r.covid_period:
        add('load factor = passengers / seats (vs reported)', p, r.load_factor, r.load_factor_derived, 1.0,
            'inputs rounded to 0.1m; COVID quarters skipped (tiny volumes make rounding error large)')

# full-year totals: sum of four quarters vs annual report figure
for y in range(2018, 2026):
    for m in ['revenue_total', 'aero_revenue', 'commercial_revenue', 'aif_revenue', 'ebitda', 'pax_total', 'movements']:
        s = q.loc[q.year == y, m].sum()
        add(f'4 quarters = annual: {m}', f'{y}', get(f'{y}Q4', m, 'ytd'), s, 0.6,
            'Q4 derived from the same annual figure, so this confirms Q1-Q3 + derived Q4 add up')

# independent check: each quarter vs the prior-year column of the next year's same-quarter report
for _, r in q.iterrows():
    y, qq = r.year, r.quarter
    nxt = f'{y + 1}Q{qq}'
    if nxt not in periods or qq == 4:
        continue
    for m in ['revenue_total', 'aero_revenue', 'commercial_revenue', 'aif_revenue', 'pax_total', 'movements', 'ebitda']:
        if r.period in ('2021Q3', '2023Q1'):
            continue  # originals are OCR; compared separately below
        add(f'original vs restated: {m}', r.period, get(r.period, m), r[m], 0.25,
            'difference = GTAA restated the figure a year later (restated value used)')
# annual: FY vs next year's annual prior column
for y in range(2018, 2025):
    for m in ['revenue_total', 'pax_total', 'movements', 'ebitda']:
        add(f'original vs restated (annual): {m}', f'{y}', get(f'{y + 1}Q4', m, 'ytd_prior'),
            get(f'{y}Q4', m, 'ytd'), 0.25)

# OCR cross-checks (Q1 2023 scanned; Q3 2021 broken font)
for pp, nx in (('2023Q1', '2024Q1'), ('2021Q3', '2022Q3')):
    for m in FLOW:
        if pd.isna(get(pp, m)):
            continue
        add(f'OCR vs restated comparative: {m}', pp, get(nx, m, 'prior'), get(pp, m), 0.05,
            'OCR can drop decimals or columns; restated value is used')

# report self-checks (current - prior = reported change)
sc = d[(d.self_check == 'FAIL') & ~d.metric.isin(['operating_covenant', 'debt_service_covenant'])]
for _, r in sc.iterrows():
    checks.append(dict(check='line self-check (current - prior = change)', period=r.period, expected=None,
                       actual=r.value, diff=None, tolerance=None, result='FAIL', note=r.raw_line))

t = pd.DataFrame(checks)
t.to_csv(os.path.join(OUT, 'tieout_report.csv'), index=False)
summ = t.assign(group=t.check.str.replace(r':.*', '', regex=True)).groupby(['group', 'result']).size().unstack(fill_value=0)
print(summ.to_string())
print('\nFAILS:')
print(t[t.result == 'FAIL'][['check', 'period', 'expected', 'actual', 'diff', 'note']].to_string(max_colwidth=70))
