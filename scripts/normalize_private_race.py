"""Normalize permitted provider records into Baken-KING's race-data.js schema.

This module performs NO network requests. Feed records exported with permission.
"""
from datetime import datetime

VENUES = {"札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉"}
BET_TYPES = {"win","show","bracket","quinella","wide","exacta","trio","trifecta"}
ORDERED = {"exacta","trifecta"}
SIZE = {"win":1,"show":1,"bracket":2,"quinella":2,"wide":2,"exacta":2,"trio":3,"trifecta":3}

def normalize_race(record):
    """Input: normalized provider-neutral mapping; no guesses for missing fields."""
    date = record["date"]
    if not isinstance(date,str):
        raise ValueError("invalid_date")
    venue = record["venue"]
    number = record["raceNumber"]
    if venue not in VENUES or not isinstance(number,int) or isinstance(number,bool) or not 1<=number<=12:
        raise ValueError("invalid_race_identity")
    start = datetime.fromisoformat(record["scheduledStartAt"])
    if start.utcoffset() is None or start.utcoffset().total_seconds()!=9*3600 or start.date().isoformat()!=date:
        raise ValueError("invalid_jst_start")
    horses = []
    seen = set()
    for horse in record["horses"]:
        n = horse["number"]
        if not isinstance(n,int) or isinstance(n,bool) or not 1<=n<=18 or n in seen:
            raise ValueError("invalid_horse_number")
        seen.add(n)
        name = horse["name"].strip()
        frame = horse["frame"]
        if not name or not isinstance(frame,int) or isinstance(frame,bool) or not 1<=frame<=8:
            raise ValueError("invalid_horse")
        status = horse.get("status","running")
        if status not in ("running","scratched","excluded"):
            raise ValueError("invalid_horse_status")
        horses.append({"number":n,"name":name,"frame":frame,"status":status})
    if not horses:
        raise ValueError("empty_card")
    if len(horses)>18:
        raise ValueError("too_many_horses")
    result = record.get("result")
    if result is not None:
        if result.get("status")!="official-final":
            raise ValueError("not_final")
        finish=result.get("finish")
        if not isinstance(finish,list) or any(not isinstance(n,int) or isinstance(n,bool) or n not in seen for n in finish) or len(finish)!=len(set(finish)):
            raise ValueError("invalid_finish")
        payouts=[]
        for item in result["payouts"]:
            kind=item["type"]
            nums=item["numbers"]
            yen=item["yenPer100"]
            if kind not in BET_TYPES or not isinstance(nums,list) or len(nums)!=SIZE.get(kind) or not all(isinstance(n,int) and not isinstance(n,bool) and 1<=n<=(8 if kind=="bracket" else 18) for n in nums):
                raise ValueError("invalid_payout_combination")
            if len(set(nums))!=len(nums) and not (kind=="bracket" and len(nums)==2 and nums[0]==nums[1]):
                raise ValueError("invalid_payout_combination")
            if not isinstance(yen,int) or isinstance(yen,bool) or yen<0:
                raise ValueError("invalid_payout_amount")
            payouts.append({"type":kind,"numbers":nums if kind in ORDERED else sorted(nums),"yenPer100":yen})
        refunds=[]
        for item in result.get("refunds",[]):
            kind=item["type"]
            nums=item["numbers"]
            if kind not in BET_TYPES or not isinstance(nums,list) or len(nums)!=SIZE.get(kind) or not all(isinstance(n,int) and not isinstance(n,bool) and 1<=n<=(8 if kind=="bracket" else 18) for n in nums):
                raise ValueError("invalid_refund_combination")
            if len(set(nums))!=len(nums) and not (kind=="bracket" and nums[0]==nums[1]):
                raise ValueError("invalid_refund_combination")
            refunds.append({"type":kind,"numbers":nums if kind in ORDERED else sorted(nums)})
        result={"status":"official-final","finish":result["finish"],"payouts":payouts,"refunds":refunds}
    return {"schemaVersion":1,"date":date,"venue":venue,"raceNumber":number,
            "raceName":record.get("raceName"),"scheduledStartAt":record["scheduledStartAt"],
            "upstreamRaceId":str(record["upstreamRaceId"]),
            "horses":sorted(horses,key=lambda h:h["number"]),
            "source":{"kind":"user-provided","label":record.get("sourceLabel","Private provider export")},
            **({"result":result} if result is not None else {})}

def payout_for_ticket(ticket, result):
    """Return yen for one virtual ticket, or None if results are not final."""
    if result is None or result.get("status")!="official-final":
        return None
    kind=ticket["type"]
    numbers=ticket["numbers"]
    stake=ticket["stakeYen"]
    if kind not in BET_TYPES or not isinstance(numbers,list) or len(numbers)!=SIZE[kind] or not isinstance(stake,int) or isinstance(stake,bool) or stake<=0 or stake%100:
        raise ValueError("invalid_ticket")
    if not isinstance(numbers,list) or not all(isinstance(n,int) and not isinstance(n,bool) for n in numbers):
        raise ValueError("invalid_ticket_numbers")
    key=tuple(numbers if kind in ORDERED else sorted(numbers))
    matches=[p for p in result["payouts"] if p["type"]==kind and tuple(p["numbers"] if kind in ORDERED else sorted(p["numbers"]))==key]
    refunds=[r for r in result.get("refunds",[]) if r["type"]==kind and tuple(r["numbers"] if kind in ORDERED else sorted(r["numbers"]))==key]
    if matches and refunds:
        raise ValueError("conflicting_payout_and_refund")
    if len(matches)>1 or len(refunds)>1:
        raise ValueError("duplicate_settlement_entry")
    if refunds:
        return stake
    if matches:
        return stake//100*matches[0]["yenPer100"]
    return 0
