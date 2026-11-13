#!/usr/bin/env python3
"""Create compact, display-only assets from the 98 approved badge originals.

The original images are never changed. Step PNGs are cropped to a clean round
medallion with an antialiased alpha boundary. Output dimensions are capped at
512px for responsive mobile display. Uses deterministic WebP settings.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
STEP_BASE = ROOT / "assets/badges/step"
G1_BASE = ROOT / "collection/pins"
OUTPUT = ROOT / "assets/badges/display"
OUTPUT.mkdir(parents=True, exist_ok=True)
step = json.loads((STEP_BASE / "manifest.json").read_text(encoding="utf-8"))["entries"]
g1 = json.loads((G1_BASE / "g1-manifest.json").read_text(encoding="utf-8"))["images"]
if len(step) != 50 or len(g1) != 48:
    raise ValueError("Badge count changed; refusing to generate partial display set")

def optimize(src, dest, circular=False):
    im = Image.open(src)
    im.load()
    im = im.convert("RGBA")
    if circular:
        side = min(im.size)
        x = (im.width-side)//2
        y = (im.height-side)//2
        im = im.crop((x,y,x+side,y+side))
        # Mask at source resolution to prevent any square background edges.
        # Radius matches the CSS mask used for approved step medals.
        mask = Image.new("L", im.size, 0)
        draw = ImageDraw.Draw(mask)
        pad = round(side*0.04)
        draw.ellipse((pad,pad,side-1-pad,side-1-pad), fill=255)
        im.putalpha(mask)
    im.thumbnail((512,512), Image.Resampling.LANCZOS)
    if not circular:
        # G1 medallions are irregular shields. Remove only near-black
        # pixels connected to the outer corners, not dark inner details.
        darkness = im.convert("RGB").convert("L").point(
            lambda value: 255 if value < 65 else 0
        )
        for seed in ((0, 0), (darkness.width-1, 0),
                     (0, darkness.height-1),
                     (darkness.width-1, darkness.height-1)):
            if darkness.getpixel(seed) == 255:
                ImageDraw.floodfill(darkness, seed, 128)
        alpha = darkness.point(lambda value: 0 if value == 128 else 255)
        coverage = alpha.histogram()[255] / (alpha.width * alpha.height)
        if not 0.30 < coverage < 0.75:
            raise ValueError(f"Suspicious G1 mask: {src.name}: {coverage:.3f}")
        im.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.65)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=84, method=6, exact=True)
    with Image.open(dest) as verify:
        verify.load()
        if verify.width>512 or verify.height>512:
            raise ValueError("Unexpected dimensions")
    return dest.stat().st_size

items = []
for x in step:
    src = STEP_BASE / x["filename"]
    dest = OUTPUT / (x["id"]+".webp")
    size = optimize(src,dest,circular=True)
    items.append({"key":x["id"],"file":dest.name,"bytes":size})
for x in g1:
    src = G1_BASE / x["filename"]
    dest = OUTPUT / x["filename"]
    size = optimize(src,dest)
    items.append({"key":x["race_id"]+"_"+x["variant"],"file":dest.name,"bytes":size})

if len(items)!=98 or len({i["key"] for i in items})!=98 or len({i["file"] for i in items})!=98:
    raise ValueError("Duplicate output entries")
manifest={"version":2,"count":98,"source":"approved-originals","g1Background":"border-connected dark background removed","files":items}
(OUTPUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Built",len(items),"optimized images; total bytes:",sum(x["bytes"] for x in items),
      "largest:",max(x["bytes"] for x in items))
