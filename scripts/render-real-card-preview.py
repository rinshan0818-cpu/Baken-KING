#!/usr/bin/env python3
"""Render fixed-size JPEG cards from genuine, unmodified Wikimedia Commons photos.

The image is cropped for presentation, but horse/jockey pixels are NOT generated.
Build source: cards-real/assets/*.jpg
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math

SRC=Path("cards-real/assets")
DST=Path("cards-real/rendered")
DST.mkdir(parents=True,exist_ok=True)
W,H=900,1200
# Position of the horse / horse face in the underlying landscape photograph.
CARDS=[
    ("equinox","イクイノックス",6,"equinox-standard.jpg","equinox-holo.jpg",.22,.22),
    ("orfevre","オルフェーヴル",6,"orfevre-standard.jpg","orfevre-holo.jpg",.28,.39),
    ("dura","ドゥラエレーデ",1,"dura-standard.jpg","dura-standard.jpg",.66,.69),
]
FONTS=[
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
fontfile=next((x for x in FONTS if Path(x).is_file()),None)
if not fontfile: raise RuntimeError("Please install fonts-noto-cjk for Japanese text")
def font(size): return ImageFont.truetype(fontfile,size)

def crop_around(im,focus):
    """Portrait crop centred on the horse's face instead of photo centre."""
    sw,sh=im.size
    # Full-height crop using only photographic pixels; no invented scenery.
    crop_w=int(sh*W/H)
    if crop_w<=sw:
        x=max(0,min(sw-crop_w,round(sw*focus-crop_w*.5)))
        return im.crop((x,0,x+crop_w,sh)).resize((W,H),Image.Resampling.LANCZOS)
    # Very narrow source: fit without stretching, with photographic blur behind it.
    bg=im.resize((W,H),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(26))
    fit=im.copy();fit.thumbnail((W,H),Image.Resampling.LANCZOS)
    bg.paste(fit,((W-fit.width)//2,(H-fit.height)//2))
    return bg

def make_image(slug,name,stars,filename,focus,holo):
    photo=Image.open(SRC/filename).convert("RGB")
    body=crop_around(photo,focus)
    body=ImageEnhance.Contrast(body).enhance(1.045)
    body=ImageEnhance.Color(body).enhance(1.035)
    # Place black tint and gold labels on independent raster layers for iPhone reliability.
    im=body.convert("RGBA")
    shade=Image.new("RGBA",(W,H),(0,0,0,0))
    px=shade.load()
    for y in range(H):
        t=y/H
        a=int(145*(max(0,1-t*9)**1.4)+210*(max(0,(t-.69)/.31)**1.4))
        for x in range(W): px[x,y]=(4,9,19,min(215,a))
    im=Image.alpha_composite(im,shade)
    if holo:
        # Iridescence is added as subtle streaks; original horse remains visible.
        glaze=Image.new("RGBA",(W,H),(0,0,0,0));g=ImageDraw.Draw(glaze)
        for k in range(14):
            x=int(-500+k*135); y=int(k*19)
            colors=[(92,167,255,35),(240,110,210,32),(130,250,225,35),(255,185,95,30)]
            g.polygon([(x,y),(x+52,y),(x+880,y+1180),(x+820,y+1180)],fill=colors[k%4])
        im=Image.alpha_composite(im,glaze)
    d=ImageDraw.Draw(im)
    gold="#eac178";bright="#ffe1a3"
    d.rounded_rectangle((18,18,W-18,H-18),radius=35,outline=gold,width=9)
    d.rounded_rectangle((35,35,W-35,H-35),radius=27,outline=bright,width=2)
    if holo:
        for i,c in enumerate(["#67dcf4","#e68ef9","#ffd088"]):
            d.line([(35+i*4,38),(W-35,38)],fill=c,width=2)
    # A readable star row independent of number-of-star circle size.
    starfont=font(50 if stars>=6 else 65)
    title="★"*stars
    bb=d.textbbox((0,0),title,font=starfont)
    d.text(((W-(bb[2]-bb[0]))//2,53),title,font=starfont,fill=bright,stroke_width=2,stroke_fill="#362715")
    # Keep horse photo dominant; a small dark bottom strip supports name legibility.
    name_size=57
    while name_size>26:
        f=font(name_size)
        box=d.textbbox((0,0),name,font=f,stroke_width=1)
        if box[2]-box[0]<W-70:break
        name_size-=2
    tx=(W-(box[2]-box[0]))/2
    d.text((tx,1073),name,font=f,fill=bright,stroke_width=3,stroke_fill="#1d1820")
    out=DST/(slug+("-holo" if holo else "-standard")+".jpg")
    im.convert("RGB").save(out,"JPEG",quality=88,optimize=True,subsampling=0)
    print(out, out.stat().st_size)

for slug,name,stars,normal,holo,nx,hx in CARDS:
    make_image(slug,name,stars,normal,nx,False)
    make_image(slug,name,stars,holo,hx,True)
