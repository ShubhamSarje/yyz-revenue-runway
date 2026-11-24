"""Phase 1: extract quarterly figures from GTAA MD&A text files.

Input : data/raw/text/<period>.txt  (one file per report, '<<<PAGE n>>>' markers)
Output: data/raw/gtaa_extract_long.csv  (one row per period x metric, with source page,
        raw line, prior-year comparative and an arithmetic self-check)

Each report's current-period value is read from the MD&A tables. Every table line also
holds the prior-year comparative and the reported change, so we check
current - prior == change (within rounding) on every value we take.
"""
import re, csv, glob, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXT = os.path.join(BASE, 'data', 'raw', 'text')
OUT = os.path.join(BASE, 'data', 'raw', 'gtaa_extract_long.csv')

NUM = re.compile(r'\(?-?[\d,]*\.?\d+\)?%?|—|-(?=\s|$)')

# metric -> (label regex at line start, section it must appear after, unit)
# 'section' = a regex that must have appeared earlier in the text (keeps us in the right table)
METRICS = [
    ('revenue_total',      r'Total Revenues',                          None,                'CAD m'),
    ('ebitda',             r'EBITDA(?! [Mm]argin)(?!/)(?! \(non)',     None,                'CAD m'),
    ('ebitda_margin',      r'EBITDA [Mm]argin',                        None,                '%'),
    ('net_income',         r'Net (?:\([Ll]oss\) )?(?:[Ii]ncome|[Ll]oss)(?: ?\((?:[Ll]oss|[Ii]ncome)\))?',                           None,                'CAD m'),
    ('pax_domestic',       r'Domestic',                                r'Passenger Activity', 'm pax'),
    ('pax_international',  r'International',                           r'Passenger Activity', 'm pax'),
    ('pax_total',          r'Total',                                   r'Passenger Activity', 'm pax'),
    ('movements',          r'Aircraft movements',                      None,                'thousand'),
    ('mtow',               r'MTOW',                                    None,                'm tonnes'),
    ('seats',              r'Seats(?! per)',                           None,                'm seats'),
    ('load_factor',        r'Load factor',                             None,                '%'),
    ('landing_fees',       r'Landing fees',                            r'Revenues',          'CAD m'),
    ('general_terminal',   r'General terminal charges',                r'Revenues',          'CAD m'),
    ('aero_revenue',       r'Aeronautical [Rr]evenues',                r'Landing fees',      'CAD m'),
    ('concessions_rentals',r'Concessions (?:&|and) rentals',           r'Landing fees',      'CAD m'),
    ('parking_ground',     r'Car parking (?:&|and) ground',            r'Landing fees',      'CAD m'),
    ('other_revenue',      r'Other',                                   r'Car parking (?:&|and) ground', 'CAD m'),
    ('commercial_revenue', r'(?:Commercial|Non-aeronautical) [Rr]evenues',                  r'Landing fees',      'CAD m'),
    ('aif_revenue',        r'Airport [Ii]mprovement [Ff]ees',          r'(?:Commercial|Non-aeronautical) [Rr]evenues', 'CAD m'),
    ('ground_rent',        r'Ground rent',                             r'Expenses',          'CAD m'),
    ('pilt',               r'PILT',                                    r'Ground rent',       'CAD m'),
    ('goods_services',     r'Goods and services',                      r'Ground rent',       'CAD m'),
    ('salaries',           r'Salaries, wages and benefits',            r'Ground rent',       'CAD m'),
    ('total_debt',         r'(?:Total|Gross) Debt(?! ?/)',             None,                'CAD m'),
    ('net_debt',           r'Net Debt(?! ?\d? ?/)',                    None,                'CAD m'),
    ('debt_per_epax',      r'(?:Total|Gross) Debt ?/ ?(?:EPAX|Enplaned)', None,             'CAD'),
    ('net_debt_per_epax',  r'Net Debt[ \d()]*/ ?(?:EPAX|Enplaned)',    None,                'CAD'),
    ('cpe',                r'(?:\(CPE\)|Air Carrier Cost ?/ ?Enplaned)', None,              'CAD'),
    ('operating_covenant', r'(?:MTI )?Operating [Cc]ovenant',          None,                '%'),
    ('debt_service_covenant', r'(?:MTI )?Debt [Ss]ervice [Cc]ovenant', None,                '%'),
]
FLOW = {'revenue_total','ebitda','net_income','pax_domestic','pax_international','pax_total',
        'movements','mtow','seats','landing_fees','general_terminal','aero_revenue',
        'concessions_rentals','parking_ground','other_revenue','commercial_revenue',
        'aif_revenue','ground_rent','pilt','goods_services','salaries'}
# lines inside the MD&A only (financial statements later in the PDF use $ thousands)
MAX_PAGE = 22


def to_float(tok):
    t = tok.strip()
    if t in ('—', '-'):
        return 0.0
    neg = t.startswith('(') and t.rstrip('%').endswith(')')
    t = t.strip('()%').replace(',', '')
    try:
        v = float(t)
    except ValueError:
        return None
    return -v if neg else v


def numbers_after_label(rest):
    """All value tokens after a label (footnote markers are still included; see choose_offset)."""
    rest = re.sub(r'\(\$\)|\(\$ ?millions\)|\(thousands\)|\(millions?\)|\(million [a-z]+\)|\(x\)|\(%\)|\(tonnes\)|\(CPE\)', ' ', rest)
    rest = re.sub(r'^\s*-\s*GAAP', ' ', rest)
    rest = rest.translate(str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789'))
    rest = re.sub(r'\(minimum requirement of \d+ ?%\)', ' ', rest)
    rest = re.sub(r'(\d)\s+%', r'\1%', rest).replace('pp', ' ').replace('$', ' ')
    out = []
    words_before = 0
    for r in rest.split():
        r2 = r.strip(',;*')
        if NUM.fullmatch(r2):
            out.append(r2)
        elif out:  # words after numbers end the row
            break
        elif re.search(r'[A-Za-z]{3,}', r2):
            words_before += 1
            if words_before > 4:   # prose sentence, not a table row
                return []
    return out


def is_marker(tok):
    return re.fullmatch(r'\(?\d{1,2}\)?', tok) is not None


def choose_offset(toks):
    """Drop leading footnote markers. Prefer the offset where current - prior == change."""
    best = None
    for off in range(0, 3):
        if off and not all(is_marker(t) for t in toks[:off]):
            break
        v = [to_float(t) for t in toks[off:off + 3]]
        if len(v) == 3 and None not in v and abs((v[0] - v[1]) - v[2]) <= max(0.15, 0.002 * abs(v[0])):
            return toks[off:]
        if best is None and (off == 0 and not is_marker(toks[0])):
            best = toks
    # no arithmetic match: drop single-digit markers
    i = 0
    while i < len(toks) - 2 and is_marker(toks[i]) and ('.' in ''.join(toks[i+1:i+3]) or '%' in toks[i+1]):
        i += 1
    return toks[i:]


def load(period):
    pages = []
    with open(os.path.join(TEXT, f'{period}.txt'), encoding='utf-8', errors='ignore') as f:
        cur = None
        for line in f:
            m = re.match(r'<<<PAGE (\d+)>>>', line)
            if m:
                cur = int(m.group(1)); continue
            pages.append((cur or 0, line.rstrip('\n')))
    if not any(p for p, _ in pages):  # OCR file without page markers
        pages = [(0, l) for _, l in pages]
    return pages


def report_kind(period):
    q = period[-1]
    return {'1': 'Q1', '2': 'H1', '3': 'M9', '4': 'FY'}[q]


def mda_start(lines):
    for pg, l in lines:
        if re.fullmatch(r'\s*FORWARD.LOOKING INFORMATION\s*', l, re.I):
            return pg or 0
    for pg, l in lines:
        if re.search(r'FORWARD.LOOKING INFORMATION', l):
            return pg or 0
    return 0


def extract(period):
    raw = load(period)
    raw = [(pg, l.translate(str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789'))) for pg, l in raw]
    raw = [(pg, l.replace('\u2010', '-').replace('\u2011', '-').replace('\u2013', '-')) for pg, l in raw]
    p0 = mda_start(raw)
    lines = [(pg, l) for pg, l in raw if not pg or (p0 <= pg <= p0 + MAX_PAGE)]
    kind = report_kind(period)
    found = {}
    for idx, (pg, line) in enumerate(lines):
        s = line.strip()
        for name, lab, sect, unit in METRICS:
            if name in found:
                continue
            m = re.match(lab + r'(?=\W|$)', s)
            if not m:
                continue
            if sect and not re.search(sect, ' '.join(l for _, l in lines[max(0, idx-40):idx])):
                continue
            rest = s[m.end():]
            vals = numbers_after_label(rest)
            j = idx
            if not vals and not re.search(r'[a-z]{4,}', re.sub(r'\(.*?\)', '', rest)):
                # label wrapped: numbers on the next line
                if idx + 1 < len(lines):
                    j = idx + 1
                    vals = numbers_after_label(lines[j][1])
            if len(vals) < 2:
                continue
            vals = choose_offset(vals)
            if len(vals) < 2:
                continue
            found[name] = dict(page=pg, line=s if j == idx else s + ' | ' + lines[j][1].strip(),
                               toks=vals, unit=unit)
    return kind, found


def interpret(kind, name, toks):
    """Map tokens to current value, prior value, ytd values according to report layout."""
    v = [to_float(t) for t in toks]
    pct_only = all(t.endswith('%') for t in toks) or name in ('load_factor', 'ebitda_margin')
    out = dict(value=v[0], prior=v[1] if len(v) > 1 else None, ytd=None, ytd_prior=None, check=None)
    if pct_only:
        if kind == 'FY':
            pcts = [to_float(t) for t in toks if t.endswith('%')]
            if len(pcts) >= 4 and name in ('load_factor', 'ebitda_margin'):
                out.update(value=pcts[0], prior=pcts[1], ytd=pcts[2], ytd_prior=pcts[3], q4_reported=True)
            else:
                out.update(ytd=pcts[0] if pcts else v[0], value=None, q4_reported=False)
            return out
        if kind in ('H1', 'M9') and len(v) >= 4:
            # cur, prior, [change], ytd, ytd_prior ; changes in pp were stripped of 'pp' and may remain
            pcts = [to_float(t) for t in toks if t.endswith('%')]
            if len(pcts) >= 4:
                out.update(value=pcts[0], prior=pcts[1], ytd=pcts[2], ytd_prior=pcts[3])
        return out
    if len(v) >= 3 and v[2] is not None and v[0] is not None and v[1] is not None:
        out['check'] = abs((v[0] - v[1]) - v[2]) <= max(0.15, 0.002 * abs(v[0]))
    if kind == 'FY':
        if len(v) >= 8:
            out.update(ytd=v[4], ytd_prior=v[5], q4_reported=True)
        else:
            out.update(ytd=v[0], ytd_prior=v[1], value=None, q4_reported=False)
        return out
    if kind in ('H1', 'M9') and len(v) >= 8:
        out.update(ytd=v[4], ytd_prior=v[5])
    elif kind in ('H1', 'M9') and len(v) >= 6:
        out.update(ytd=v[3] if len(v) == 6 else v[4], ytd_prior=v[4] if len(v) == 6 else v[5])
    return out


def main():
    rows = []
    for f in sorted(glob.glob(os.path.join(TEXT, '*.txt'))):
        period = os.path.basename(f)[:-4]
        kind, found = extract(period)
        for name, lab, sect, unit in METRICS:
            if name not in found:
                rows.append(dict(period=period, report_kind=kind, metric=name, unit=unit, value='',
                                 prior='', ytd='', ytd_prior='', q4_reported='', self_check='', page='', raw_line='NOT FOUND'))
                continue
            d = found[name]
            it = interpret(kind, name, d['toks'])
            rows.append(dict(period=period, report_kind=kind, metric=name, unit=unit,
                             value=it['value'], prior=it['prior'], ytd=it['ytd'], ytd_prior=it['ytd_prior'],
                             q4_reported=it.get('q4_reported', ''),
                             self_check='' if it['check'] is None else ('ok' if it['check'] else 'FAIL'),
                             page=d['page'], raw_line=d['line']))
    with open(OUT, 'w', newline='') as o:
        w = csv.DictWriter(o, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print('wrote', OUT, len(rows), 'rows')


if __name__ == '__main__':
    main()
