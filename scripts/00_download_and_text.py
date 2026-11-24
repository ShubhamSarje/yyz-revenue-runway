"""Phase 1, step 0: download the source documents and turn them into text.

- GTAA quarterly/annual reports (Q1 2018 - Q3 2026) from data/raw/gtaa_reports_manifest.csv
- GTAA aeronautical fee schedules (2018 - 2027) from data/raw/fees_manifest.csv
- Text per report into data/raw/text/<period>.txt with '<<<PAGE n>>>' markers.
  Two reports need OCR (tesseract): Q1 2023 is a scanned image and Q3 2021 uses a broken
  font encoding. Both are later replaced by restated values (see 02_build_quarterly.py);
  the OCR text is only a cross-check.

The PDFs are not committed to the repo (they are the GTAA's documents); run this script to
rebuild them. StatCan tables are fetched by 00b_statcan.py.

Requires: curl, pdfplumber, pdftoppm + tesseract (for the two OCR reports).
"""
import csv, os, subprocess, re, glob
import pdfplumber

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, 'data', 'raw')
OCR_PERIODS = {'2023Q1': None, '2021Q3': 24}   # period -> last page to OCR (None = all)


def download(manifest, folder, key):
    os.makedirs(os.path.join(RAW, folder), exist_ok=True)
    with open(os.path.join(RAW, manifest)) as f:
        for row in csv.DictReader(f):
            out = os.path.join(RAW, folder, f'{row[key]}.pdf')
            if not os.path.exists(out):
                subprocess.run(['curl', '-s', '-L', '--max-time', '120', '-o', out, row['url']], check=True)
            print('ok', out)


def ocr(pdf, last_page, workdir):
    os.makedirs(workdir, exist_ok=True)
    args = ['pdftoppm', '-r', '200', '-png'] + (['-l', str(last_page)] if last_page else []) + [pdf, f'{workdir}/p']
    subprocess.run(args, check=True)
    pages = sorted(glob.glob(f'{workdir}/p-*.png'), key=lambda f: int(re.search(r'-(\d+)\.png', f).group(1)))
    out = []
    for png in pages:
        n = int(re.search(r'-(\d+)\.png', png).group(1))
        subprocess.run(['tesseract', png, png[:-4], '--psm', '6'], capture_output=True)
        out.append(f'\n<<<PAGE {n}>>>\n' + open(png[:-4] + '.txt').read())
    return ''.join(out)


def to_text():
    os.makedirs(os.path.join(RAW, 'text'), exist_ok=True)
    for pdf in sorted(glob.glob(os.path.join(RAW, 'gtaa', '*.pdf'))):
        period = os.path.basename(pdf)[:-4]
        out = os.path.join(RAW, 'text', f'{period}.txt')
        if period in OCR_PERIODS:
            txt = ocr(pdf, OCR_PERIODS[period], os.path.join(RAW, f'ocr_{period}'))
        else:
            with pdfplumber.open(pdf) as doc:
                txt = ''.join(f'\n<<<PAGE {i + 1}>>>\n' + (p.extract_text() or '') for i, p in enumerate(doc.pages))
        open(out, 'w').write(txt)
        print('text', out)


if __name__ == '__main__':
    download('gtaa_reports_manifest.csv', 'gtaa', 'period')
    download('fees_manifest.csv', 'fees', 'effective')
    to_text()
