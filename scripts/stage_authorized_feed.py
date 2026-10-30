"""Copy a reviewed authorized race-card artifact into a deployment staging directory.

No JRA fetching, no GitHub writes, no deployment.
"""
import argparse
import json
from pathlib import Path
from scripts.prepare_authorized_feed import prepare

def stage(feed, permission, destination):
    target = Path(destination)
    if target.name != "authorized-race-cards.json":
        raise ValueError("Unexpected output name")
    count = prepare(feed, permission, target)
    result = json.loads(target.read_text(encoding="utf-8"))
    if len(result["races"]) != count:
        raise ValueError("Staged count mismatch")
    return count

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("permission", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(f"Staged {stage(args.feed, args.permission, args.destination)} authorized races (not published)")
