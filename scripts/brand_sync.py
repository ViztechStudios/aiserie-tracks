#!/usr/bin/env python3
"""
Aiserie Tracks — brand sync (v2.6.0 "Fern & Bark" identity).

One master logo, drawn parametrically in the SAME flat hand-drawn style as the
in-app mascots (src mascots: kawaii sticker style, warm ink outline, fern green
+ mango gold), then every brand surface is regenerated from it:

  assets/icon.png                        1024 full-bleed  (iOS app icon via EAS + Expo)
  assets/favicon.png                     128
  assets/splash-icon.png                 512  (native splash + in-app boot curtain)
  assets/android-icon-foreground.png     1024 transparent, safe zone
  assets/android-icon-background.png     1024 solid fern green
  assets/android-icon-monochrome.png     1024 white silhouette
  public/icons/icon-192.png / icon-512.png / icon-maskable-512.png
  public/apple-touch-icon.png            180 (iOS home-screen web icon)
  public/splash/startup-*.png            iOS PWA launch screens (14 devices)

Run from repo root:  python3 scripts/brand_sync.py
Whenever the logo changes, re-run this script — icons, PWA and iOS stay in sync.
"""
import math
import os

import cairosvg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(REPO, 'assets-art')
ASSETS = os.path.join(REPO, 'assets')
PUBLIC = os.path.join(REPO, 'public')
os.makedirs(ART, exist_ok=True)
os.makedirs(os.path.join(PUBLIC, 'icons'), exist_ok=True)
os.makedirs(os.path.join(PUBLIC, 'splash'), exist_ok=True)

# ------------------------------------------------------------ palette -------
INK = '#3A2A1B'
CAT_GOLD = '#F6BC55'
CAT_GOLD_DK = '#E39A33'
CAT_CREAM = '#FFF3DC'
EAR_PINK = '#F7B9A2'
BLUSH = '#F5A8A0'
DOG_TAN = '#F3D6A4'
DOG_TAN_DK = '#DFAF72'
DOG_CREAM = '#FFFAF0'
BANDANA = '#1E7A50'
BANDANA_DK = '#14503A'
COIN = '#EFC26B'
COIN_DK = '#D9A13B'
CREAM_BADGE = '#FFF6E6'
FERM_BG = '#0D3B27'
GOLD = '#F0D492'
LEAF = '#9BD9B8'

STROKE = 9


def S():
    return f'stroke="{INK}" stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round"'


# --------------------------------------------------------- face parts -------
def eye(x, y, rx, ry):
    return (
        f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{INK}"/>'
        f'<circle cx="{x - rx * 0.34}" cy="{y - ry * 0.38}" r="{rx * 0.30}" fill="#FFFFFF"/>'
        f'<circle cx="{x + rx * 0.30}" cy="{y + ry * 0.30}" r="{rx * 0.14}" fill="#FFFFFF" opacity="0.9"/>'
    )


def blush(x, y, rx, ry):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{BLUSH}" opacity="0.75"/>'


def cat_mouth(x, y, w):
    d = (f'M {x - w} {y} Q {x - w * 0.5} {y + w * 0.62} {x} {y} '
         f'Q {x + w * 0.5} {y + w * 0.62} {x + w} {y}')
    return f'<path d="{d}" fill="none" {S()}/>'


def cat_nose(x, y):
    return (f'<path d="M {x - 13} {y - 9} Q {x} {y - 14} {x + 13} {y - 9} '
            f'Q {x + 9} {y + 10} {x} {y + 11} Q {x - 9} {y + 10} {x - 13} {y - 9} Z" '
            f'fill="#C97B4A" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')


def whiskers(cx, cy, side):
    out = []
    for d in (-14, 0, 14):
        x1 = cx + side * 92
        x2 = cx + side * (140 + (12 if abs(d) > 13 else 0))
        y1 = cy + d
        y2 = cy + d * 1.3
        out.append(f'<path d="M {x1} {y1} Q {(x1 + x2) / 2} {(y1 + y2) / 2 + side * -5} {x2} {y2}" '
                   f'fill="none" stroke="{INK}" stroke-width="5.5" stroke-linecap="round" opacity="0.85"/>')
    return ''.join(out)


def cat_ear(x, y, side, scale=1.0):
    w = 108 * scale
    h = 118 * scale
    tip_x = x + side * w * 0.42
    tip_y = y - h
    outer_x = x + side * w
    d = (f'M {x} {y} '
         f'C {x + side * 8} {y - h * 0.55} {tip_x - side * 26} {tip_y + 14} {tip_x} {tip_y} '
         f'C {tip_x + side * 30} {tip_y + 16} {outer_x - side * 6} {y - h * 0.32} {outer_x} {y} '
         f'Q {x + side * w * 0.5} {y + 16} {x} {y} Z')
    inner = (f'M {x + side * 22} {y - 8} '
             f'C {x + side * 26} {y - h * 0.42} {tip_x + side * 2} {tip_y + 30} {tip_x + side * 6} {tip_y + 26} '
             f'C {tip_x + side * 20} {tip_y + 34} {outer_x - side * 22} {y - h * 0.36} {outer_x - side * 20} {y - 10} '
             f'Q {x + side * w * 0.5} {y + 2} {x + side * 22} {y - 8} Z')
    return f'<path d="{d}" fill="{CAT_GOLD}" {S()}/><path d="{inner}" fill="{EAR_PINK}"/>'


def dog_ear(x, y, side, scale=1.0):
    w = 96 * scale
    h = 148 * scale
    d = (f'M {x} {y} '
         f'C {x + side * w * 0.96} {y - h * 0.40} {x + side * w * 1.02} {y + h * 0.22} {x + side * w * 0.58} {y + h * 0.62} '
         f'C {x + side * w * 0.30} {y + h * 0.84} {x + side * w * 0.02} {y + h * 0.46} {x} {y} Z')
    return f'<path d="{d}" fill="{DOG_TAN_DK}" {S()}/>'


def bandana(neck_y, cx, half_w, knot_side=1, hanging=True):
    band = (f'<path d="M {cx - half_w} {neck_y - 26} '
            f'Q {cx} {neck_y + 34} {cx + half_w} {neck_y - 26} '
            f'L {cx + half_w} {neck_y + 6} '
            f'Q {cx} {neck_y + 66} {cx - half_w} {neck_y + 6} Z" '
            f'fill="{BANDANA}" stroke="{INK}" stroke-width="{STROKE - 1}" stroke-linejoin="round"/>')
    parts = [band]
    if hanging:
        kx = cx + knot_side * (half_w - 6)
        ky = neck_y + 18
        tri = f'M {kx} {ky + 4} L {kx + knot_side * 66} {ky + 44} L {kx + knot_side * 14} {ky + 86} Z'
        parts.append(f'<path d="{tri}" fill="{BANDANA}" stroke="{INK}" stroke-width="{STROKE - 1}" stroke-linejoin="round"/>')
        parts.append(f'<circle cx="{kx}" cy="{ky + 8}" r="17" fill="{BANDANA_DK}" stroke="{INK}" stroke-width="{STROKE - 1}"/>')
    return ''.join(parts)


def coin(px, py, r):
    out = [f'<circle cx="{px}" cy="{py}" r="{r}" fill="{COIN}" stroke="{COIN_DK}" stroke-width="{STROKE - 2}"/>',
           f'<circle cx="{px}" cy="{py}" r="{r * 0.72}" fill="none" stroke="{COIN_DK}" stroke-width="6" opacity="0.9"/>']
    pr = r * 0.30
    out.append(f'<ellipse cx="{px}" cy="{py + pr * 0.42}" rx="{pr * 0.62}" ry="{pr * 0.5}" fill="{COIN_DK}"/>')
    for dx in (-pr * 0.52, 0, pr * 0.52):
        out.append(f'<circle cx="{px + dx}" cy="{py - pr * 0.42}" r="{pr * 0.2}" fill="{COIN_DK}"/>')
    return ''.join(out)


def sparkle(x, y, r, color=GOLD):
    return (f'<path d="M {x} {y - r} Q {x + r * 0.22} {y - r * 0.22} {x + r} {y} '
            f'Q {x + r * 0.22} {y + r * 0.22} {x} {y + r} '
            f'Q {x - r * 0.22} {y + r * 0.22} {x - r} {y} '
            f'Q {x - r * 0.22} {y - r * 0.22} {x} {y - r} Z" fill="{color}"/>')


# ------------------------------------------------------- logo geometry ------
BADGE_CX, BADGE_CY, BADGE_R = 512, 512, 348

PU_CX, PU_CY, PU_R = 386, 566, 196     # pup head
TA_CX, TA_CY, TA_R = 656, 590, 174     # tabby head
COIN_X, COIN_Y, COIN_R = 512, 300, 50


def bust_pup():
    """Bark bust: shoulders + head + face + bandana (clipped by the badge)."""
    p = []
    body_top = PU_CY + PU_R * 0.58
    bx, bw = PU_CX, PU_R * 1.10
    top = PU_CY + PU_R * 0.88
    bot = PU_CY + PU_R * 2.30
    chest = (f'M {bx - bw} {top} '
             f'C {bx - bw * 1.08} {PU_CY + PU_R * 1.52} {bx - bw * 0.82} {bot} {bx} {bot} '
             f'C {bx + bw * 0.82} {bot} {bx + bw * 1.08} {PU_CY + PU_R * 1.52} {bx + bw} {top} '
             f'Q {bx} {PU_CY + PU_R * 0.74} {bx - bw} {top} Z')
    p.append(f'<path d="{chest}" fill="{DOG_TAN}" {S()}/>')
    p.append(dog_ear(bx - PU_R * 0.80, PU_CY - PU_R * 0.56, -1, scale=PU_R / 210))
    p.append(dog_ear(bx + PU_R * 0.80, PU_CY - PU_R * 0.56, +1, scale=PU_R / 210))
    p.append(f'<circle cx="{bx}" cy="{PU_CY}" r="{PU_R}" fill="{DOG_TAN}" {S()}/>')
    p.append(f'<ellipse cx="{bx}" cy="{PU_CY + PU_R * 0.34}" rx="{PU_R * 0.42}" ry="{PU_R * 0.30}" fill="{DOG_CREAM}"/>')
    ey = PU_CY - PU_R * 0.08
    p.append(eye(bx - PU_R * 0.34, ey, PU_R * 0.14, PU_R * 0.16))
    p.append(eye(bx + PU_R * 0.34, ey, PU_R * 0.14, PU_R * 0.16))
    p.append(f'<ellipse cx="{bx}" cy="{PU_CY + PU_R * 0.16}" rx="{PU_R * 0.10}" ry="{PU_R * 0.075}" fill="{INK}"/>')
    my = PU_CY + PU_R * 0.36
    p.append(f'<path d="M {bx - PU_R * 0.22} {my} Q {bx} {my + PU_R * 0.20} {bx + PU_R * 0.22} {my}" fill="none" {S()}/>')
    p.append(blush(bx - PU_R * 0.60, PU_CY + PU_R * 0.24, PU_R * 0.12, PU_R * 0.07))
    p.append(blush(bx + PU_R * 0.60, PU_CY + PU_R * 0.24, PU_R * 0.12, PU_R * 0.07))
    p.append(bandana(body_top + 8, bx, bw * 0.76, knot_side=-1, hanging=False))
    return ''.join(p)


def bust_tabby():
    """Fern bust: shoulders + head + face + bandana (clipped by the badge)."""
    p = []
    bx, bw = TA_CX, TA_R * 1.06
    top = TA_CY + TA_R * 0.88
    bot = TA_CY + TA_R * 2.30
    chest = (f'M {bx - bw} {top} '
             f'C {bx - bw * 1.08} {TA_CY + TA_R * 1.52} {bx - bw * 0.82} {bot} {bx} {bot} '
             f'C {bx + bw * 0.82} {bot} {bx + bw * 1.08} {TA_CY + TA_R * 1.52} {bx + bw} {top} '
             f'Q {bx} {TA_CY + TA_R * 0.74} {bx - bw} {top} Z')
    p.append(f'<path d="{chest}" fill="{CAT_GOLD}" {S()}/>')
    p.append(cat_ear(bx - TA_R * 0.66, TA_CY - TA_R * 0.68, -1, scale=TA_R / 210))
    p.append(cat_ear(bx + TA_R * 0.66, TA_CY - TA_R * 0.68, +1, scale=TA_R / 210))
    p.append(f'<circle cx="{bx}" cy="{TA_CY}" r="{TA_R}" fill="{CAT_GOLD}" {S()}/>')
    for off in (-0.5, 0, 0.5):
        sx = bx + off * TA_R * 0.9
        sy = TA_CY - TA_R * 0.86
        p.append(f'<path d="M {sx} {sy + 12} q {off * 8 + 4} 40 {off * 4} 58" fill="none" '
                 f'stroke="{CAT_GOLD_DK}" stroke-width="18" stroke-linecap="round"/>')
    p.append(f'<ellipse cx="{bx}" cy="{TA_CY + TA_R * 0.30}" rx="{TA_R * 0.46}" ry="{TA_R * 0.34}" fill="{CAT_CREAM}"/>')
    ey = TA_CY - TA_R * 0.10
    p.append(eye(bx - TA_R * 0.34, ey, TA_R * 0.155, TA_R * 0.175))
    p.append(eye(bx + TA_R * 0.34, ey, TA_R * 0.155, TA_R * 0.175))
    p.append(cat_nose(bx, TA_CY + TA_R * 0.20))
    p.append(cat_mouth(bx, TA_CY + TA_R * 0.42, TA_R * 0.15))
    p.append(blush(bx - TA_R * 0.62, TA_CY + TA_R * 0.26, TA_R * 0.13, TA_R * 0.075))
    p.append(blush(bx + TA_R * 0.62, TA_CY + TA_R * 0.26, TA_R * 0.13, TA_R * 0.075))
    p.append(whiskers(bx, TA_CY + TA_R * 0.16, -1))
    p.append(whiskers(bx, TA_CY + TA_R * 0.16, +1))
    p.append(bandana(top - 8, bx, bw * 0.76, knot_side=1, hanging=False))
    return ''.join(p)


def logo_svg(mode='full'):
    """
    mode 'full'  — square, green bg + cream badge (icon, favicon, splash icon)
    mode 'mark'  — transparent bg, cream badge centered at SAFE zone (adaptive fg, maskable)
    mode 'mono'  — transparent bg, white silhouette (adaptive monochrome)
    """
    defs = ''
    body = []

    if mode == 'full':
        defs += ('<radialGradient id="bg" cx="0.5" cy="0.42" r="0.75">'
                 '<stop offset="0" stop-color="#155539"/>'
                 '<stop offset="0.62" stop-color="#0D3B27"/>'
                 '<stop offset="1" stop-color="#092B1C"/></radialGradient>')
        body.append('<rect width="1024" height="1024" fill="url(#bg)"/>')

    body.append(f'<circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="{BADGE_R}" fill="{CREAM_BADGE}"/>')
    # soft inner rim so the badge reads as a plate, not a sticker
    body.append(f'<circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="{BADGE_R - 10}" fill="none" stroke="#E8D9BC" stroke-width="5" opacity="0.9"/>')

    clip = (f'<clipPath id="badge"><circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="{BADGE_R - 10}"/></clipPath>')
    defs += clip

    if mode == 'mono':
        # flat white silhouettes of the two companions + coin
        sil = []
        sil.append(f'<circle cx="{PU_CX}" cy="{PU_CY}" r="{PU_R}" fill="#FFFFFF"/>')
        sil.append(f'<circle cx="{TA_CX}" cy="{TA_CY}" r="{TA_R}" fill="#FFFFFF"/>')
        sil.append(f'<ellipse cx="{PU_CX - PU_R * 0.86}" cy="{PU_CY - PU_R * 0.30}" rx="{PU_R * 0.42}" ry="{PU_R * 0.62}" fill="#FFFFFF"/>')
        sil.append(f'<ellipse cx="{PU_CX + PU_R * 0.86}" cy="{PU_CY - PU_R * 0.30}" rx="{PU_R * 0.42}" ry="{PU_R * 0.62}" fill="#FFFFFF"/>')
        sil.append(f'<path d="M {TA_CX - TA_R * 0.72} {TA_CY - TA_R * 0.42} l 34 -84 l 34 74 Z" fill="#FFFFFF"/>')
        sil.append(f'<path d="M {TA_CX + TA_R * 0.72} {TA_CY - TA_R * 0.42} l -34 -84 l -34 74 Z" fill="#FFFFFF"/>')
        sil.append(f'<circle cx="{COIN_X}" cy="{COIN_Y}" r="{COIN_R}" fill="#FFFFFF"/>')
        group = f'<g clip-path="url(#badge)">{"".join(sil)}</g>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{defs}{group}</svg>')

    duo = bust_pup() + bust_tabby()
    body.append(f'<g clip-path="url(#badge)">{duo}</g>')
    # coin floats between the ears, above the heads
    body.append(coin(COIN_X, COIN_Y, COIN_R))
    body.append(sparkle(COIN_X - 92, COIN_Y - 34, 15))
    body.append(sparkle(COIN_X + 96, COIN_Y + 18, 12, '#E8D9BC'))

    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>{defs}</defs>{"".join(body)}</svg>'


def render(svg, size, out):
    cairosvg.svg2png(bytestring=svg.encode(), write_to=out, output_width=size, output_height=size)
    return out


def fit_transparent(img, canvas, fraction):
    """Scale image so its content box occupies `fraction` of the canvas, centered."""
    w, h = img.size
    target = int(canvas * fraction)
    scale = target / max(w, h)
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def main():
    svg_full = logo_svg('full')
    svg_mark = logo_svg('mark')
    svg_mono = logo_svg('mono')

    master = os.path.join(ART, 'logo-master.svg')
    with open(master, 'w') as f:
        f.write(svg_full)
    render(svg_full, 1024, os.path.join(ART, 'logo-master.png'))
    print('logo master rendered')

    # ---- Expo assets ----
    icon = Image.open(os.path.join(ART, 'logo-master.png')).convert('RGB')
    icon.save(os.path.join(ASSETS, 'icon.png'), optimize=True)

    fav = icon.resize((128, 128), Image.LANCZOS)
    fav.save(os.path.join(ASSETS, 'favicon.png'), optimize=True)
    splash = icon.resize((512, 512), Image.LANCZOS)
    splash.save(os.path.join(ASSETS, 'splash-icon.png'), optimize=True)

    # ---- Android adaptive layers ----
    bg = Image.new('RGB', (1024, 1024), FERM_BG)
    bg.save(os.path.join(ASSETS, 'android-icon-background.png'), optimize=True)

    mark = Image.open(os.path.join(ART, 'logo-master.png'))
    # mark is full-bleed (has own bg) — rebuild transparent version from svg_mark
    render(svg_mark, 1024, os.path.join(ART, 'logo-mark.png'))
    mark_t = Image.open(os.path.join(ART, 'logo-mark.png')).convert('RGBA')
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    m = fit_transparent(mark_t, 1024, 0.72)  # badge circle = 0.72*0.68 ≈ 0.49 of canvas
    fg.paste(m, ((1024 - m.width) // 2, (1024 - m.height) // 2), m)
    fg.save(os.path.join(ASSETS, 'android-icon-foreground.png'), optimize=True)

    render(svg_mono, 1024, os.path.join(ART, 'logo-mono.png'))
    mono_src = Image.open(os.path.join(ART, 'logo-mono.png')).convert('RGBA')
    alpha = mono_src.split()[3]
    mono = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
    white = Image.new('RGBA', mono_src.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    mm = fit_transparent(white, 1024, 0.56)
    mono.paste(mm, ((1024 - mm.width) // 2, (1024 - mm.height) // 2), mm)
    mono.save(os.path.join(ASSETS, 'android-icon-monochrome.png'), optimize=True)

    # ---- PWA icons ----
    ic512 = icon.resize((512, 512), Image.LANCZOS)
    ic512.save(os.path.join(PUBLIC, 'icons', 'icon-512.png'), optimize=True)
    ic192 = icon.resize((192, 192), Image.LANCZOS)
    ic192.save(os.path.join(PUBLIC, 'icons', 'icon-192.png'), optimize=True)
    mask = Image.new('RGB', (1024, 1024), FERM_BG)
    mm = fit_transparent(mark_t, 1024, 0.62)
    mask.paste(mm, ((1024 - mm.width) // 2, (1024 - mm.height) // 2), mm)
    mask.resize((512, 512), Image.LANCZOS).save(os.path.join(PUBLIC, 'icons', 'icon-maskable-512.png'), optimize=True)

    ati = icon.resize((180, 180), Image.LANCZOS)
    ati.save(os.path.join(PUBLIC, 'apple-touch-icon.png'), optimize=True)
    print('icons done')

    # ---- iOS PWA startup screens ----
    here = os.path.dirname(os.path.abspath(__file__))
    lora = os.path.join(REPO, 'node_modules', '@expo-google-fonts', 'lora', '700Bold', 'Lora_700Bold.ttf')
    manr = os.path.join(REPO, 'node_modules', '@expo-google-fonts', 'manrope', '600SemiBold', 'Manrope_600SemiBold.ttf')
    if not os.path.exists(lora):
        lora = '/usr/share/fonts/truetype/noto/NotoSerifSC-Bold.otf'
    if not os.path.exists(manr):
        manr = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

    badge_src = Image.open(os.path.join(ART, 'logo-mark.png')).convert('RGBA')

    def startup(w, h, path):
        img = Image.new('RGB', (w, h), FERM_BG)
        d = ImageDraw.Draw(img)
        # soft radial glow behind the badge
        glow_r = int(min(w, h) * 0.46)
        mask = Image.new('L', (glow_r * 2, glow_r * 2), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, glow_r * 2, glow_r * 2], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(glow_r * 0.35))
        glow = Image.new('RGB', (glow_r * 2, glow_r * 2), '#155539')
        cx, cy = w // 2, int(h * 0.375)
        img.paste(glow, (cx - glow_r, cy - glow_r), mask)

        bs = int(min(w, h) * 0.315)
        badge = badge_src.resize((bs, bs), Image.LANCZOS)
        img.paste(badge, (cx - bs // 2, cy - bs // 2), badge)

        fs = int(min(w, h) * 0.085)
        f_title = ImageFont.truetype(lora, fs)
        f_tag = ImageFont.truetype(manr, max(14, int(fs * 0.42)))
        ty = cy + bs // 2 + int(min(w, h) * 0.075)
        title = 'Aiserie Tracks'
        tb = d.textbbox((0, 0), title, font=f_title)
        d.text((cx - (tb[2] - tb[0]) / 2 - tb[0], ty), title, font=f_title, fill=GOLD)
        # divider
        ly = ty + (tb[3] - tb[1]) + int(min(w, h) * 0.045)
        lw = int(min(w, h) * 0.24)
        d.line([cx - lw / 2, ly, cx + lw / 2, ly], fill=COIN_DK, width=max(2, int(min(w, h) * 0.003)))
        # paw dot in the divider
        pr = max(4, int(min(w, h) * 0.011))
        d.ellipse([cx - pr, ly - pr, cx + pr, ly + pr], fill=GOLD)
        tag = 'Your money, beautifully tracked'
        tbb = d.textbbox((0, 0), tag, font=f_tag)
        d.text((cx - (tbb[2] - tbb[0]) / 2 - tbb[0], ly + int(min(w, h) * 0.032)), tag, font=f_tag, fill=LEAF)
        img.save(path, optimize=True)

    devices = [
        (320, 568, 2), (375, 667, 2), (375, 812, 3), (390, 844, 3), (393, 852, 3),
        (402, 874, 3), (414, 896, 2), (414, 896, 3), (430, 932, 3), (440, 956, 3),
        (768, 1024, 2), (820, 1180, 2), (834, 1194, 2), (1024, 1366, 2),
    ]
    for dw, dh, dpr in devices:
        startup(dw * dpr, dh * dpr, os.path.join(PUBLIC, 'splash', f'startup-{dw}x{dh}-{dpr}x.png'))
    print('startup splashes done:', len(devices))

    # ---- preview sheet ----
    names = ['icon.png', 'favicon.png', 'splash-icon.png', 'android-icon-foreground.png',
             'android-icon-monochrome.png']
    cells = []
    for n in names:
        im = Image.open(os.path.join(ASSETS, n)).convert('RGBA')
        im.thumbnail((250, 250))
        cells.append((n, im))
    for n in ['icons/icon-192.png', 'icons/icon-maskable-512.png', 'apple-touch-icon.png']:
        im = Image.open(os.path.join(PUBLIC, n)).convert('RGBA')
        im.thumbnail((250, 250))
        cells.append((n, im))
    sp = Image.open(os.path.join(PUBLIC, 'splash', 'startup-390x844-3x.png'))
    sp.thumbnail((250, 520))
    cells.append(('startup-390', sp.convert('RGB')))
    cell_w = sum(max(260, im.width + 20) for _, im in cells) + 20
    sheet = Image.new('RGB', (cell_w, 560), (245, 245, 245))
    x = 10
    dd = ImageDraw.Draw(sheet)
    for name, im in cells:
        if im.mode == 'RGBA':
            bgp = Image.new('RGB', im.size, (255, 255, 255))
            bgp.paste(im, (0, 0), im)
        else:
            bgp = im
        sheet.paste(bgp, (x, 30))
        dd.text((x, 8), os.path.basename(name), fill=(0, 0, 0))
        x += max(260, im.width + 20)
    sheet.save('/home/z/my-project/assets-work/brand-v3-preview.png')
    print('preview written')
    print('ALL OK')


if __name__ == '__main__':
    main()
