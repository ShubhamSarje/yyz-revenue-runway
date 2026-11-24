"""Phase 1, step 0b: fetch StatCan tables and keep only what the project uses.

- 23-10-0008-01 (inactive, to Sep 2022) and 23-10-0302-01 (from Jan 2019):
  itinerant movements by sector (domestic / transborder / other international), Toronto Pearson rows only
- 18-10-0004-01: CPI, all items, Canada and Ontario, from 2017

Source: Statistics Canada, Web Data Service. Statistics Canada Open Licence.
"""
import os, io, json, zipfile, urllib.request
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'data', 'raw', 'statcan')
os.makedirs(OUT, exist_ok=True)


def table(pid):
    meta = json.load(urllib.request.urlopen(f'https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{pid}/en'))
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(meta['object']).read()))
    return pd.read_csv(z.open(f'{pid}.csv'), low_memory=False)


for pid in ('23100008', '23100302'):
    df = table(pid)
    df[df['Airports'].str.contains('Pearson', na=False)].to_csv(os.path.join(OUT, f'yyz_{pid}.csv'), index=False)

cpi = table('18100004')
cpi = cpi[(cpi['Products and product groups'] == 'All-items') & cpi['GEO'].isin(['Canada', 'Ontario'])
          & (cpi['REF_DATE'] >= '2017-01')]
cpi.to_csv(os.path.join(OUT, 'cpi_all_items_2017on.csv'), index=False)
print('done')
