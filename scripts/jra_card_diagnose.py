"""Inspect a locally saved JRA race-card HTML without copying horse data.

Reports how horse-number columns are represented, including images and CSS.
No network requests; useful for diagnosing JRA's image-based horse numbers.
"""
import argparse
import json
from pathlib import Path
from bs4 import BeautifulSoup

def diagnose(html):
    soup = BeautifulSoup(html, "html.parser")
    tables = []
    for index, table in enumerate(soup.find_all("table")):
        headers = []
        for tr in table.find_all("tr")[:12]:
            cells = tr.find_all(["th", "td"], recursive=False)
            labels = [c.get_text(" ", strip=True) for c in cells]
            if any("馬番" in label for label in labels) and any("馬名" in label for label in labels):
                headers = labels
                break
        if not headers:
            continue
        rows = table.find_all("tr")
        image_cells = 0
        blank_cells = 0
        image_samples = []
        for tr in rows:
            cells = tr.find_all("td", recursive=False)
            for cell in cells[:3]:
                if not cell.get_text(" ", strip=True):
                    blank_cells += 1
                    img = cell.find("img")
                    if img:
                        image_cells += 1
                        if len(image_samples) < 4:
                            image_samples.append({"alt": img.get("alt", ""),
                                "src": img.get("src", "").split("?")[0][-100:],
                                "class": cell.get("class", [])})
        tables.append({"tableIndex": index, "headers": headers,
                       "rowCount": len(rows), "blankCells": blank_cells,
                       "imageCells": image_cells, "imageSamples": image_samples})
    return {"candidateTables": tables, "tableCount": len(tables)}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("html", type=Path)
    a = p.parse_args()
    print(json.dumps(diagnose(a.html.read_text(encoding="utf-8")),
                     ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
