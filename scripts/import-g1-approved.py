#!/usr/bin/env python3
"""Validate and import the user-approved G1 badge archive. No generated art."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "collection/pins/import/g1-approved.zip"
DEST = ROOT / "collection/pins"
MANIFEST = DEST / "g1-manifest.json"

def main():
    if not ARCHIVE.is_file():
        print("No upload archive found; nothing to import.")
        return
    current = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected = {entry["filename"] for entry in current["images"]}
    if len(expected) != 48 or current.get("count") != 48:
        raise ValueError("The registry must define exactly 48 unique files")
    with zipfile.ZipFile(ARCHIVE) as src:
        names = src.namelist()
        actual = {name for name in names if name.endswith(".webp")}
        if len(names) != len(set(names)) or actual != expected:
            raise ValueError("Archive has missing, extra, or duplicate badge names")
        if any("/" in name or "\\" in name for name in names):
            raise ValueError("Nested paths are forbidden in the approved archive")
        if any(name not in expected | {"manifest.json", "README.md", "contact_sheet.jpg"} for name in names):
            raise ValueError("Unexpected archive entry")
        sources = {}
        source_manifest = json.loads(src.read("manifest.json"))
        for item in source_manifest.get("images", []):
            sources[item["file"]] = item["sha256"]
        if set(sources) != expected:
            raise ValueError("Source archive manifest does not match registry")
        for name in sorted(expected):
            info = src.getinfo(name)
            if info.file_size > 2_000_000 or info.file_size < 100:
                raise ValueError("Unexpected image size: " + name)
            data = src.read(name)
            if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                raise ValueError("Invalid WebP: " + name)
            if hashlib.sha256(data).hexdigest() != sources[name]:
                raise ValueError("SHA-256 mismatch: " + name)
        for name in sorted(expected):
            (DEST / name).write_bytes(src.read(name))
    current["githubImagesUploaded"] = True
    current["status"] = "approved-artwork-on-github"
    MANIFEST.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ARCHIVE.unlink()
    print("Imported 48 approved G1 WebP images and marked manifest ready.")

if __name__ == "__main__":
    main()
