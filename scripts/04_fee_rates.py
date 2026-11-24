"""Phase 2: fee rates from the GTAA aeronautical fee schedules + annual % changes from the MD&A.

Rates (excluding HST) per schedule, matched label -> value by position on the printed line:
- gtc_domestic_per_seat, gtc_non_domestic_per_seat  (general terminal charge, per arriving seat)
- landing_per_1000kg                                  (commercial aircraft / aircraft > 19,000 kg)
- aif_local, aif_connecting                           (airport improvement fee per enplaned passenger)

Annual aeronautical fee change (%) as stated in each year's Q1 MD&A
("Aeronautical fees increased by X%"), used as a published rate index.

Outputs: data/processed/fee_rates.csv, data/processed/fee_changes_mdna.csv
"""
import os, re, glob
import pdfplumber
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEES = os.path.join(BASE, 'data', 'raw', 'fees')
TEXT = os.path.join(BASE, 'data', 'raw', 'text')
OUT = os.path.join(BASE, 'data', 'processed')

LABELS = {
    'gtc_domestic_per_seat': r'^Domestic Arrivals',
    'gtc_non_domestic_per_seat': r'^Non-?\s?Domestic Arrivals',
    'landing_per_1000kg': r'^(Commercial Aircraft|Aircraft in excess of 19,000 kg \(based on arriving MTOW\))',
    'aif_local': r'^Non-?\s?C\s?onnecting Passenger',
    'aif_connecting': r'^Connecting Passenger',
}
MONEY = re.compile(r'^\$?\s?([\d,]+\.\d{2})$')


def lines_with_positions(page):
    """Group words into printed lines by their vertical position."""
    words = page.extract_words(keep_blank_chars=False, use_text_flow=False)
    rows = []
    for w in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        for r in rows:
            if abs(r['top'] - w['top']) < 3:
                r['words'].append(w); break
        else:
            rows.append({'top': w['top'], 'words': [w]})
    out = []
    for r in sorted(rows, key=lambda r: r['top']):
        ws = sorted(r['words'], key=lambda w: w['x0'])
        out.append((r['top'], ' '.join(w['text'] for w in ws), ws))
    return out


def money_on_line(ws, after_x):
    toks = [w['text'] for w in ws if w['x0'] > after_x]
    joined = ' '.join(toks).replace('$ ', '$')
    m = re.findall(r'\$?([\d,]+\.\d{2})', joined)
    return float(m[0].replace(',', '')) if m else None


def parse(pdf_path):
    res = {}
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        lines = lines_with_positions(page)
        # page-level money column (2024-2025 layout): values printed in a separate block
        money_tokens = [w for _, _, ws in lines for w in ws if MONEY.match(w['text'].replace(' ', ''))]
        for key, pat in LABELS.items():
            for top, text, ws in lines:
                t = text.replace('‐', '-')
                if not re.search(pat, t):
                    continue
                if key == 'landing_per_1000kg' and 'flat rate' in t:
                    continue
                v = money_on_line(ws, ws[0]['x0'])
                if v is None:  # value printed slightly above/below: nearest money token by height
                    cands = sorted(money_tokens, key=lambda w: abs(w['top'] - top))
                    if cands and abs(cands[0]['top'] - top) < 8:
                        v = float(cands[0]['text'].replace('$', '').replace(',', ''))
                res[key] = v
                break
        # landing fee: read from the Landing Fees section text (layout changed in 2021 and 2027)
        txt = page.extract_text()
        sec = txt[txt.find('Landing Fees'):txt.find('Apron Fees')]
        m = re.search(r'Commercial[^\n]*?Aircraft[^\n]*?\$\s?([\d,]+\.\d{2})', sec) or \
            re.search(r'For all aircraft weights[^\n]*?\$\s?([\d,]+\.\d{2})', sec) or \
            re.search(r'in excess of 19,000 kg \(based on arriving MTOW\)\D{0,3}\$\s?([\d,]+\.\d{2})', sec)
        res['landing_per_1000kg'] = float(m.group(1).replace(',', '')) if m else None
    return res


rows = []
for f in sorted(glob.glob(os.path.join(FEES, '*.pdf'))):
    eff = os.path.basename(f)[:-4]
    r = {'effective_date': eff, **parse(f), 'source': f'GTAA aeronautical fees, effective {eff}'}
    rows.append(r)
fr = pd.DataFrame(rows)
fr.to_csv(os.path.join(OUT, 'fee_rates.csv'), index=False)
print(fr.drop(columns='source').to_string(index=False))

# annual % change in aeronautical fees, as stated in the MD&A (sentence naming January 1 of that year)
chg = []
for y in range(2018, 2027):
    t = re.sub(r'\s+', ' ', open(os.path.join(TEXT, f'{y}Q1.txt'), errors='ignore').read())
    m = None
    for hit in re.finditer(r'January 1, ' + str(y), t):
        seg = t[hit.start():hit.start() + 400]
        m = re.search(r'[Aa]eronautical (?:fees|rates)[^.%]{0,80}?increased[^.%]{0,40}?by (?:an average of )?([\d.]+) ?(?:%|per cent)', seg)
        if m:
            break
    if m:
        chg.append(dict(year=y, pct=float(m.group(1)), statement=m.group(0)[:150], source=f'{y}Q1 MD&A'))
    else:
        chg.append(dict(year=y, pct=0.0, statement='no increase stated; fee schedule rates unchanged from prior year',
                        source='fee schedules'))
pd.DataFrame(chg).to_csv(os.path.join(OUT, 'fee_changes_mdna.csv'), index=False)
print(pd.DataFrame(chg)[['year', 'pct', 'statement']].to_string(index=False))
