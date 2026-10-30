"""Convert a permissioned local race export into Baken-KING race-data JSON.

No network access. Does not publish or fetch third-party data.
Usage: python scripts/import_private_race.py input.json output.json
"""
import argparse
import json
from pathlib import Path
from normalize_private_race import normalize_race

def convert(payload):
    if not isinstance(payload,dict) or not isinstance(payload.get("races"),list):
        raise ValueError("expected_object_with_races")
    races=[normalize_race(r) for r in payload["races"]]
    ids=[(r["date"],r["venue"],r["raceNumber"]) for r in races]
    if len(ids)!=len(set(ids)):
        raise ValueError("duplicate_race")
    return {"schemaVersion":1,"raceCount":len(races),"races":races}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("input",type=Path)
    p.add_argument("output",type=Path)
    a=p.parse_args()
    data=convert(json.loads(a.input.read_text(encoding="utf-8")))
    if a.input.resolve()==a.output.resolve():
        p.error("input and output must be different")
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Converted",data["raceCount"],"races locally; no data published")

if __name__=="__main__":
    main()
