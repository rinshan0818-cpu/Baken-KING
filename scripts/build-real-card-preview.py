#!/usr/bin/env python3
"""Fetch only verified Commons photographs and create local, compressed preview assets."""
import hashlib
import io
import time
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

PHOTOS = {
    "equinox-standard": "Equinox 2023 Japan Cup 01.jpg",
    "equinox-holo": "Equinox 2023 Tenno Sho (Autumn).jpg",
    "orfevre-standard": "Orfevre 20121125a.jpg",
    "orfevre-holo": "Orfevre 2012.JPG",
    "dura-standard": "Dura Erede Tokyo Yushun 2023(IMG1).jpg",
}
OUT = Path("cards-real/assets")
OUT.mkdir(parents=True, exist_ok=True)
for stem, title in PHOTOS.items():
    filename = title.replace(" ", "_")
    digest = hashlib.md5(filename.encode("utf-8")).hexdigest()
    url = f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{urllib.parse.quote(filename)}"
    request = urllib.request.Request(url, headers={
        "User-Agent": "BakenKING-CardPreview/0.1 (noncommercial card prototype; https://github.com/rinshan0818-cpu/Baken-KING)"
    })
    image = None
    for retry in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                blob = response.read(16_000_000)
            image = Image.open(io.BytesIO(blob))
            image.load()
            break
        except Exception as error:
            if retry == 2:
                raise RuntimeError(f"Cannot download Commons source {title}: {error}")
            time.sleep(retry + 2)
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
    target = OUT / f"{stem}.jpg"
    image.save(target, "JPEG", quality=85, optimize=True)
    print(f"{stem}: {image.width}x{image.height}, {target.stat().st_size:,} bytes")
