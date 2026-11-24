"""YYZ Revenue Runway: 06 export app data (Phase 5).

Reads the SQL model (tables + views) and writes the static JSON the web app loads.
The app never queries the database live: like RouteIQ, it ships a snapshot, so the
Supabase project can be paused after launch without breaking the dashboard.

Usage
  DATABASE_URL="postgresql://..." python scripts/06_export_app_data.py
  (any Postgres that has sql/01, 01b, 03, 04, 05 and the passenger_mix table loaded)

Uses the psql client, so no Python database driver is needed.
"""
import json
import os
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "data" / "app_data.json"
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@/yyz?host=/tmp/pg&port=5433")

QUERIES = {
    # one row per quarter: raw KPIs + YoY / vs-2019 changes + trailing-12-month metrics
    "quarters": """
        select k.*,
               to_jsonb(c) - array['period','year','quarter','period_start','covid_period','omicron_flag',
                                   'revenue_total','pax_total','movements','ebitda'] as chg,
               to_jsonb(t) - array['period','year','quarter','period_start','total_debt','cpe'] as ttm
        from quarterly_kpi k
        join v_quarterly_changes c using (period)
        join v_ttm t using (period)
        order by k.year, k.quarter""",
    "bridge": "select * from v_revenue_bridge order by grain, comparison, label, stream",
    "passenger_mix": "select * from passenger_mix order by period_label",
    "fee_rates": "select * from fee_rates order by effective_date",
    "fee_changes": "select * from fee_changes order by year",
}


def run(sql: str):
    wrapped = f"select coalesce(json_agg(q), '[]'::json) from ({sql}) q"
    res = subprocess.run(["psql", DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", wrapped],
                         capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


def sources():
    """Short source note per period and metric for tooltips: report and PDF page."""
    import csv, re
    pages = {}
    with open(ROOT / "data/raw/gtaa_extract_long.csv") as f:
        for r in csv.DictReader(f):
            pages.setdefault((r["period"], r["metric"]), r["page"])
    out = {}
    with open(ROOT / "data/processed/yyz_quarterly_sources.csv") as f:
        for r in csv.DictReader(f):
            src = r["source"]
            reps = re.findall(r"(\d{4})Q(\d)", src)
            if not reps:
                continue
            y, q = reps[0]
            label = f"Q{q} {y}" if q != "4" else f"{y} annual"
            if "annual" in src.lower() or "FY" in src:
                label = f"{y} annual report"
            else:
                label = f"GTAA Q{q} {y} report"
            pg = pages.get((f"{y}Q{q}", r["metric"]))
            note = label + (f", p.{int(float(pg))}" if pg else "")
            if "9M YTD" in src:
                note = f"Annual minus nine months ({label.replace('GTAA ', '')})"
            elif "restated" in src:
                note += " (restated comparative)"
            out.setdefault(r["period"], {})[r["metric"]] = note
    return out


def main():
    data = {name: run(sql) for name, sql in QUERIES.items()}
    data["sources"] = sources()
    data["meta"] = {
        "exported": date.today().isoformat(),
        "first_period": data["quarters"][0]["period"],
        "last_period": data["quarters"][-1]["period"],
        "units": "revenue and costs in C$ millions; passengers and seats in millions; movements in thousands",
        "source": "GTAA quarterly MD&A and annual reports; Statistics Canada tables 23-10-0008-01, "
                  "23-10-0302-01, 18-10-0004-01",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size/1024:.0f} KB  "
          + ", ".join(f"{k}={len(v)}" for k, v in data.items() if isinstance(v, list)))


if __name__ == "__main__":
    main()
