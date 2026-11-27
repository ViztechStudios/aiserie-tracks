#!/usr/bin/env python3
"""
Aiserie Tracks — brand sync (v4.1.0 "Orbit A" identity).

One master mark, drawn parametrically: a geometric ribbon-cut letter A with
an orbit ring, an ascending-bars glyph and a four-point spark — the shape of
"tracking your money in orbit". Every brand surface is regenerated from it:

  assets/icon.png                        1024 full-bleed  (iOS app icon + Android legacy)
  assets/favicon.png                     128
  assets/splash-icon.png                 512  (native splash + in-app boot curtain)
  assets/android-icon-foreground.png     1024 transparent, safe zone
  assets/android-icon-background.png     1024 soft mint field
  assets/android-icon-monochrome.png     1024 white silhouette
  public/icons/icon-192.png / icon-512.png / icon-maskable-512.png
  public/apple-touch-icon.png            180 (iOS home-screen web icon)
  public/splash/startup-*.png            iOS PWA launch screens (14 devices)

Run from repo root:  python3 scripts/brand_sync.py
Whenever the mark changes, re-run this script — icons, PWA and iOS stay in sync.
"""
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
# Frost identity: soft mint field, deep pine ink, one warm gold spark.
MINT_1 = '#F2FAF3'
MINT_2 = '#DFEFE2'
MINT_3 = '#CFE9D5'
WAVE_1 = '#C9E6D0'
WAVE_2 = '#BFDFC7'
INK_TOP = '#2F7F52'
INK_BOT = '#123E28'
FERM_BG = '#0D3B27'
GOLD = '#F0D492'
LEAF = '#9BD9B8'

# ------------------------------------------------------- mark geometry ------
# Outer silhouette of the A + counter hole (evenodd), 1024 grid.
GLYPH = (
    'M 445 240 Q 445 196 532 196 Q 619 196 619 240 '
    'L 796 790 L 678 790 L 644 640 L 420 640 L 386 790 L 268 790 Z '
    'M 497 300 L 567 300 L 532 505 Z'
)
# Left-face facet: the subtle two-tone that makes the A read as a folded ribbon.
FACET = 'M 445 240 Q 445 196 532 196 L 532 640 L 420 640 L 386 790 L 268 790 Z'
RING_BACK = 'M -368 0 A 368 132 0 0 1 368 0 L 346 0 A 346 106 0 0 0 -346 0 Z'
RING_FRONT = 'M -368 0 A 368 132 0 0 0 368 0 L 346 0 A 346 106 0 0 1 -346 0 Z'
BARS = [(652, 108), (756, 178), (860, 248)]  # (x, height) — baseline y=918
SPARKLE_XY = (858, 344, 88)


def sparkle(x, y, r, fill):
    k = 0.18
    return (f'<path d="M {x} {y - r} '
            f'C {x + k * r} {y - k * r} {x + k * r} {y - k * r} {x + r} {y} '
            f'C {x + k * r} {y + k * r} {x + k * r} {y + k * r} {x} {y + r} '
            f'C {x - k * r} {y + k * r} {x - k * r} {y + k * r} {x - r} {y} '
            f'C {x - k * r} {y - k * r} {x - k * r} {y - k * r} {x} {y - r} Z" fill="{fill}"/>')


def mark_cluster(fill: str, facet_fill: str | None = None) -> str:
    """The A + orbit + bars + spark as one group (used by every mode)."""
    p = []
    p.append(f'<g transform="translate(512 620) rotate(-18)"><path d="{RING_BACK}" fill="{fill}"/></g>')
    p.append(f'<g transform="translate(0 14)"><path d="{GLYPH}" fill="{fill}" fill-rule="evenodd"/>')
    if facet_fill:
        p.append(f'<path d="{FACET}" fill="{facet_fill}" opacity="0.10"/>')
    p.append('</g>')
    for bx, bh in BARS:
        p.append(f'<rect x="{bx}" y="{918 - bh}" width="76" height="{bh}" rx="26" fill="{fill}"/>')
    p.append(sparkle(*SPARKLE_XY, fill))
    p.append(f'<g transform="translate(512 620) rotate(-18)"><path d="{RING_FRONT}" fill="{fill}"/></g>')
    return ''.join(p)


DEFS = f'''
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="{MINT_1}"/><stop offset="0.55" stop-color="{MINT_2}"/><stop offset="1" stop-color="{MINT_3}"/>
</linearGradient>
<linearGradient id="bgSheen" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="{MINT_2}"/><stop offset="1" stop-color="{MINT_3}"/>
</linearGradient>
<linearGradient id="ink" x1="0" y1="0" x2="0.55" y2="1">
  <stop offset="0" stop-color="{INK_TOP}"/><stop offset="1" stop-color="{INK_BOT}"/>
</linearGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="55"/></filter>
'''


def bg_scene() -> str:
    """The soft mint field + aurora waves shared by the full icon."""
    body = ['<rect width="1024" height="1024" fill="url(#bg)"/>']
    body.append('<ellipse cx="780" cy="-40" rx="640" ry="250" fill="#FFFFFF" opacity="0.35" filter="url(#soft)"/>')
    body.append(f'<path d="M 0 700 Q 300 585 560 702 Q 820 815 1024 762 L 1024 1024 L 0 1024 Z" fill="{WAVE_1}" opacity="0.5"/>')
    body.append(f'<path d="M 0 815 Q 340 706 640 815 Q 880 898 1024 852 L 1024 1024 L 0 1024 Z" fill="{WAVE_2}" opacity="0.42"/>')
    return ''.join(body)


def logo_svg(mode: str = 'full') -> str:
    """
    mode 'full'  — square mint field + monogram (icon, favicon, splash icon)
    mode 'mark'  — transparent bg, monogram cluster centered (adaptive fg)
    mode 'mono'  — transparent bg, white silhouette (adaptive monochrome)
    """
    if mode == 'full':
        body = bg_scene() + mark_cluster('url(#ink)', '#FFFFFF')
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>{DEFS}</defs>{body}</svg>'
    if mode == 'mark':
        # scale the cluster into the adaptive safe zone, optically centered
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>{DEFS}</defs>'
                f'<g transform="translate(512 512) scale(0.9) translate(-512 -522)">{mark_cluster("url(#ink)", "#FFFFFF")}</g></svg>')
    # mono: pure white, no facet
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
            f'<g transform="translate(512 512) scale(0.9) translate(-512 -522)">{mark_cluster("#FFFFFF")}</g></svg>')


def render(svg: str, size: int, out: str) -> str:
    cairosvg.svg2png(bytestring=svg.encode(), write_to=out, output_width=size, output_height=size)
    return out


def fit_transparent(img: Image.Image, canvas: int, fraction: float) -> Image.Image:
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
    # soft mint field so the dark mark keeps its frosted look on every launcher
    bg = Image.new('RGB', (1024, 1024), MINT_2)
    d = ImageDraw.Draw(bg)
    d.ellipse([-300, 620, 1324, 1400], fill=MINT_3)
    bg.save(os.path.join(ASSETS, 'android-icon-background.png'), optimize=True)

    render(svg_mark, 1024, os.path.join(ART, 'logo-mark.png'))
    mark_t = Image.open(os.path.join(ART, 'logo-mark.png')).convert('RGBA')
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    m = fit_transparent(mark_t, 1024, 0.72)  # mark ≈ 0.65 of canvas — safe-zone friendly
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
    mask = Image.new('RGB', (1024, 1024), MINT_2)
    dd = ImageDraw.Draw(mask)
    dd.ellipse([-300, 620, 1324, 1400], fill=MINT_3)
    mm2 = fit_transparent(mark_t, 1024, 0.62)
    mask.paste(mm2, ((1024 - mm2.width) // 2, (1024 - mm2.height) // 2), mm2)
    mask.resize((512, 512), Image.LANCZOS).save(os.path.join(PUBLIC, 'icons', 'icon-maskable-512.png'), optimize=True)

    ati = icon.resize((180, 180), Image.LANCZOS)
    ati.save(os.path.join(PUBLIC, 'apple-touch-icon.png'), optimize=True)
    print('icons done')

    # ---- iOS PWA startup screens ----
    lora = os.path.join(REPO, 'node_modules', '@expo-google-fonts', 'lora', '700Bold', 'Lora_700Bold.ttf')
    manr = os.path.join(REPO, 'node_modules', '@expo-google-fonts', 'manrope', '600SemiBold', 'Manrope_600SemiBold.ttf')
    if not os.path.exists(lora):
        lora = '/usr/share/fonts/truetype/noto/NotoSerifSC-Bold.otf'
    if not os.path.exists(manr):
        manr = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

    badge_src = Image.open(os.path.join(ART, 'logo-mark.png')).convert('RGBA')

    def startup(w: int, h: int, path: str):
        img = Image.new('RGB', (w, h), FERM_BG)
        # one soft glow behind the tile
        glow_r = int(min(w, h) * 0.50)
        m2 = Image.new('L', (glow_r * 2, glow_r * 2), 0)
        ImageDraw.Draw(m2).ellipse([0, 0, glow_r * 2, glow_r * 2], fill=255)
        m2 = m2.filter(ImageFilter.GaussianBlur(glow_r * 0.38))
        glow = Image.new('RGB', (glow_r * 2, glow_r * 2), '#155539')
        cx, cy = w // 2, int(h * 0.385)
        img.paste(glow, (cx - glow_r, cy - glow_r), m2)

        # frosted mint tile carrying the mark — the icon, restated at boot
        ts = int(min(w, h) * 0.34)
        tile = Image.new('RGBA', (ts, ts), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        rad = int(ts * 0.24)
        td.rounded_rectangle([0, 0, ts, ts], radius=rad, fill=(223, 239, 226, 255))
        mk = fit_transparent(badge_src, ts, 0.78)
        tile.paste(mk, ((ts - mk.width) // 2, (ts - mk.height) // 2), mk)
        img.paste(tile, (cx - ts // 2, cy - ts // 2), tile)

        fs = int(min(w, h) * 0.082)
        f_title = ImageFont.truetype(lora, fs)
        f_tag = ImageFont.truetype(manr, max(14, int(fs * 0.40)))
        ty = cy + ts // 2 + int(min(w, h) * 0.072)
        d2 = ImageDraw.Draw(img)
        title = 'Aiserie Tracks'
        tb = d2.textbbox((0, 0), title, font=f_title)
        d2.text((cx - (tb[2] - tb[0]) / 2 - tb[0], ty), title, font=f_title, fill=GOLD)
        ly = ty + (tb[3] - tb[1]) + int(min(w, h) * 0.042)
        lw = int(min(w, h) * 0.20)
        d2.line([cx - lw / 2, ly, cx + lw / 2, ly], fill='#2E7D4F', width=max(2, int(min(w, h) * 0.0026)))
        tag = 'Your money, beautifully tracked'
        tbb = d2.textbbox((0, 0), tag, font=f_tag)
        d2.text((cx - (tbb[2] - tbb[0]) / 2 - tbb[0], ly + int(min(w, h) * 0.030)), tag, font=f_tag, fill=LEAF)
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
    sheet.save('/home/z/my-project/assets-work/brand-v4-preview.png')
    print('preview written')
    print('ALL OK')


if __name__ == '__main__':
    main()
