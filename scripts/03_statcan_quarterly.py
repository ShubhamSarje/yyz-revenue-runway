"""Phase 1: roll StatCan monthly data up to quarters and compare with GTAA movements.

Outputs
- data/processed/statcan_movements_quarterly.csv  sector movements, transborder share, vs GTAA movements
- data/processed/cpi_ontario_quarterly.csv        quarterly average Ontario CPI (all items)
"""
import os
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, 'data', 'raw', 'statcan')
OUT = os.path.join(BASE, 'data', 'processed')
COL = 'Domestic and international itinerant movements'
NAMES = {'Domestic movements': 'domestic', 'Transborder movements': 'transborder',
         'Other international movements': 'international_other'}


def sectors(path):
    df = pd.read_csv(path)
    df = df[df['Type of operation'] == 'Total itinerant movements']
    return df.pivot_table(index='REF_DATE', columns=COL, values='VALUE', aggfunc='sum').rename(columns=NAMES)


old = sectors(os.path.join(RAW, 'yyz_23100008.csv'))
new = sectors(os.path.join(RAW, 'yyz_23100302.csv'))
overlap = old.index.intersection(new.index)
print('overlap months:', len(overlap), '| total absolute difference:', (old.loc[overlap] - new.loc[overlap]).abs().sum().sum())

m = pd.concat([old[old.index < '2019-01'], new]).sort_index()
m = m[m.index >= '2018-01'][['domestic', 'transborder', 'international_other']]
m['total_itinerant'] = m.sum(axis=1)
m['period'] = pd.PeriodIndex(m.index, freq='M').asfreq('Q').astype(str)
q = m.groupby('period').agg(months=('total_itinerant', 'size'), domestic=('domestic', 'sum'),
                            transborder=('transborder', 'sum'), international_other=('international_other', 'sum'),
                            total_itinerant=('total_itinerant', 'sum')).reset_index()
q['transborder_share'] = (q.transborder / q.total_itinerant * 100).round(1)
g = pd.read_csv(os.path.join(OUT, 'yyz_quarterly.csv'))[['period', 'movements']]
q = q.merge(g, on='period', how='left').rename(columns={'movements': 'gtaa_movements_k'})
q['statcan_k'] = (q.total_itinerant / 1000).round(1)
q['diff_pct'] = ((q.statcan_k / q.gtaa_movements_k - 1) * 100).round(1)
q['complete_quarter'] = q.months == 3
q.to_csv(os.path.join(OUT, 'statcan_movements_quarterly.csv'), index=False)
full = q[q.complete_quarter]
print('complete quarters:', len(full), '| max abs diff vs GTAA %:', full.diff_pct.abs().max())

c = pd.read_csv(os.path.join(RAW, 'cpi_all_items_2017on.csv'))
c = c[c.GEO == 'Ontario'][['REF_DATE', 'VALUE']]
c['period'] = pd.PeriodIndex(c.REF_DATE, freq='M').asfreq('Q').astype(str)
c.groupby('period').agg(months=('VALUE', 'size'), cpi_ontario=('VALUE', 'mean')).round(2).reset_index() \
    .to_csv(os.path.join(OUT, 'cpi_ontario_quarterly.csv'), index=False)
