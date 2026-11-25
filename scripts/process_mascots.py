#!/usr/bin/env python3
"""Process raw mascot art into Aiserie Tracks app assets (v2.3.0 jungle-green theme)."""
from PIL import Image, ImageOps, ImageFilter
import os

ART = "/home/z/my-project/aiserie-tracks/assets-art"
ASSETS = "/home/z/my-project/aiserie-tracks/assets"
os.makedirs(ASSETS, exist_ok=True)


def trim_white(img, tol=18):
    """Autocrop uniform near-white margins."""
    rgb = img.convert("RGB")
    gray = rgb.convert("L")
    # mask of non-white pixels
    mask = gray.point(lambda p: 255 if p < 255 - tol else 0)
    bbox = mask.getbbox()
    if bbox:
        pad = 8
        l = max(bbox[0] - pad, 0)
        t = max(bbox[1] - pad, 0)
        r = min(bbox[2] + pad, img.width)
        b = min(bbox[3] + pad, img.height)
        return rgb.crop((l, t, r, b))
    return rgb


# ---- 1. on-white mascots: trim, keep white bg (blend with white cards) ----
for name in ("mascot-duo", "mascot-advisor", "mascot-wave"):
    img = Image.open(f"{ART}/{name}.png")
    out = trim_white(img)
    # downscale so bundles stay light; displayed <= 220px
    out.thumbnail((640, 640), Image.LANCZOS)
    out.save(f"{ASSETS}/{name}.png", optimize=True)
    print(name, out.size)

# ---- 2. app icon (iOS/general): full-bleed icon-master ----
icon = Image.open(f"{ART}/icon-master.png").convert("RGB")
icon = ImageOps.fit(icon, (1024, 1024), Image.LANCZOS)
icon.save(f"{ASSETS}/icon.png", optimize=True)
print("icon.png", icon.size)

# favicon + splash icon from same master
fav = icon.resize((128, 128), Image.LANCZOS)
fav.save(f"{ASSETS}/favicon.png", optimize=True)
splash = icon.resize((512, 512), Image.LANCZOS)
splash.save(f"{ASSETS}/splash-icon.png", optimize=True)
print("favicon/splash done")

# ---- 3. adaptive icon layers ----
# sample the art's background green (corner pixel) for a seamless backdrop
corner = icon.getpixel((10, 10))
bg_green = (corner[0], corner[1], corner[2])
print("sampled icon green:", bg_green)

bg = Image.new("RGB", (1024, 1024), bg_green)
bg.save(f"{ASSETS}/android-icon-background.png", optimize=True)

# foreground: duo art centered, occupying ~60% (safe zone 66%) over transparent
duo = Image.open(f"{ART}/mascot-duo.png")
duo_t = trim_white(duo)
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
core = 610  # < 66% safe zone
w, h = duo_t.size
scale = core / max(w, h)
duo_r = duo_t.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
# add slight rounded mask so edges of the white box are soft
m = Image.new("L", duo_r.size, 0)
Image.Image.paste
from PIL import ImageDraw
d = ImageDraw.Draw(m)
d.rounded_rectangle([0, 0, duo_r.width - 1, duo_r.height - 1], radius=60, fill=255)
m = m.filter(ImageFilter.GaussianBlur(2))
fg.paste(duo_r, ((1024 - duo_r.width) // 2, (1024 - duo_r.height) // 2), m)
fg.save(f"{ASSETS}/android-icon-foreground.png", optimize=True)
print("foreground done", duo_r.size)

# monochrome: white silhouette of duo
mono_src = duo_t.convert("L")
sil = mono_src.point(lambda p: 255 if p < 200 else 0)
mono = Image.new("RGBA", sil.size, (255, 255, 255, 0))
mono.putalpha(sil)
mono_img = Image.new("RGBA", (1024, 1024), (255, 255, 255, 0))
scale_m = core / max(mono.width, mono.height)
mono_r = mono.resize((int(mono.width * scale_m), int(mono.height * scale_m)), Image.LANCZOS)
mono_img.paste(mono_r, ((1024 - mono_r.width) // 2, (1024 - mono_r.height) // 2), mono_r)
mono_img.save(f"{ASSETS}/android-icon-monochrome.png", optimize=True)
print("monochrome done")

print("ALL OK")
