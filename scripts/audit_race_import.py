"""Audit an offline card export against the fields needed by Baken-KING.

This never fetches third-party pages, publishes data, or fills gaps by guessing.
Usage: python scripts/audit_race_import.py local_cards.json report.json
"""
import argparse
import json
from pathlib import Path

REQUIRED_RACE = ("date","venue","raceNumber","scheduledStartAt","upstreamRaceId")
REQUIRED_HORSE = ("number","name","frame")

def audit(payload):
    if not isinstance(payload,dict) or not isinstance(payload.get("races"),list):
        raise ValueError("expected_object_with_races")
    rows=[]
    for race in payload["races"]:
        missing=[field for field in REQUIRED_RACE if race.get(field) is None]
        horses=race.get("horses",[])
        if not isinstance(horses,list) or not horses:
            missing.append("horses")
        else:
            for field in REQUIRED_HORSE:
                if any(not isinstance(h,dict) or h.get(field) is None for h in horses):
                    missing.append("horses."+field)
        result=race.get("result")
        if result is not None:
            for field in ("status","finish","payouts"):
                if field not in result:
                    missing.append("result."+field)
        rows.append({"date":race.get("date"),"venue":race.get("venue"),
                     "raceNumber":race.get("raceNumber"),
                     "ready":not missing,"missingFields":missing})
    return {"raceCount":len(rows),"readyCount":sum(r["ready"] for r in rows),
            "status":"ready" if rows and all(r["ready"] for r in rows) else "incomplete",
            "races":rows}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("input",type=Path)
    p.add_argument("output",type=Path)
    args=p.parse_args()
    if args.input.resolve()==args.output.resolve():
        p.error("input and output must differ")
    report=audit(json.loads(args.input.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(report["status"],report["readyCount"],"/",report["raceCount"])
    if report["status"]!="ready":
        raise SystemExit(2)

if __name__=="__main__":
    main()
