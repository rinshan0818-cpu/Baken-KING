"""Prepare a deployable feed only from an explicitly authorized local input.

Does not fetch external race data, push commits, or deploy files.
"""
import argparse
import json
import os
from pathlib import Path
from scripts.validate_authorized_feed import validate

def prepare(feed_path, permission_path, output_path):
    source = Path(feed_path).resolve()
    permission = Path(permission_path).resolve()
    target = Path(output_path).resolve()
    if source == target or permission == target:
        raise ValueError("Input and output paths must be different")
    feed = json.loads(source.read_text(encoding="utf-8"))
    provenance = json.loads(permission.read_text(encoding="utf-8"))
    count = validate(feed, provenance)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".tmp")
    try:
        temporary.write_text(json.dumps({"races": feed["races"]}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    return count

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("permission", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    count = prepare(args.feed, args.permission, args.output)
    print(f"Prepared {count} authorized races at {args.output}; deployment not performed")

if __name__ == "__main__":
    main()
