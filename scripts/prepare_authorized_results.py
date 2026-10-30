"""Validate an explicitly authorized race result before it can be used for virtual settlement.

No live scraping, redistribution, or modification of saved tickets.
"""
from datetime import date
import json
from pathlib import Path

def validate_results(payload, permission):
    if permission.get("redistributionAuthorized") is not True:
        raise ValueError("Result redistribution permission required")
    if not permission.get("sourceName") or not permission.get("permissionReference"):
        raise ValueError("Result source and permission reference required")
    if permission["sourceName"].strip().lower() == "jra" and permission.get("jraRedistributionPermissionConfirmed") is not True:
        raise ValueError("JRA result redistribution permission not confirmed")
    races=payload.get("races")
    if not isinstance(races,list) or not 1 <= len(races) <= 108:
        raise ValueError("Invalid result races")
    keys=set()
    output=[]
    for race in races:
        day=date.fromisoformat(race["date"]).isoformat()
        venue=race.get("venue")
        number=race.get("raceNumber")
        if not isinstance(venue,str) or not venue.strip() or type(number) is not int or not 1 <= number <= 12:
            raise ValueError("Invalid result race")
        key=(day,venue,number)
        if key in keys:
            raise ValueError("Duplicate result")
        keys.add(key)
        if race.get("status") != "final":
            raise ValueError("Only finalized results are accepted")
        finish=race.get("finishOrder")
        if not isinstance(finish,list) or not 1 <= len(finish) <= 18 or any(type(n) is not int or not 1 <= n <= 18 for n in finish) or len(set(finish)) != len(finish):
            raise ValueError("Invalid finish order")
        payouts=race.get("payouts")
        if not isinstance(payouts,list):
            raise ValueError("Missing payouts")
        seen=set()
        for p in payouts:
            if p.get("type") not in ("単勝","複勝","馬連","馬単","ワイド","三連複","三連単"):
                raise ValueError("Invalid bet type")
            selection=p.get("numbers")
            expected={"単勝":1,"複勝":1,"馬連":2,"馬単":2,"ワイド":2,"三連複":3,"三連単":3}[p["type"]]
            if not isinstance(selection,list) or len(selection)!=expected or any(type(n) is not int or not 1 <= n <= 18 for n in selection) or len(set(selection))!=expected:
                raise ValueError("Invalid payout selection")
            if p["type"] in ("馬連","ワイド","三連複"):
                selection=sorted(selection)
            if type(p.get("yenPer100")) is not int or p["yenPer100"] < 0:
                raise ValueError("Invalid payout amount")
            payout_key=(p["type"],tuple(selection))
            if payout_key in seen:
                raise ValueError("Duplicate payout")
            seen.add(payout_key)
        output.append(race)
    return {"schemaVersion":1,"races":output}

def prepare(input_file,permission_file,output_file):
    data=json.loads(Path(input_file).read_text(encoding="utf-8"))
    permission=json.loads(Path(permission_file).read_text(encoding="utf-8"))
    result=validate_results(data,permission)
    target=Path(output_file)
    target.parent.mkdir(parents=True,exist_ok=True)
    temp=target.with_suffix(target.suffix+".tmp")
    try:
        temp.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)
    return len(result["races"])
