#!/usr/bin/env python3
"""
Aiserie Tracks — mascot sync (v4.1.0 refined flat style).

Redraws the three companion illustrations in a clean modern flat style:
no ink outlines, soft rounded geometry, one subtle shade facet per shape,
restrained Fern & Bark palette. Transparent PNGs so they sit on glass.

  mascot-wave.png     the pup, waving hello (lock gate, privacy shield)
  mascot-duo.png      pup + tabby together (about card, recovery screen)
  mascot-advisor.png  the tabby with an idea (empty states)
"""
import os

import cairosvg
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(REPO, 'assets-art')
ASSETS = os.path.join(REPO, 'assets')

INK = '#3A2A1B'
DOG_TAN = '#F3D6A4'
DOG_TAN_DK = '#E7BC80'
DOG_EAR = '#DFAF72'
DOG_CREAM = '#FFFAF0'
CAT_GOLD = '#F6BC55'
CAT_GOLD_DK = '#E8A63B'
CAT_CREAM = '#FFF3DC'
EAR_PINK = '#F7B9A2'
BANDANA = '#1E7A50'
BANDANA_DK = '#175E40'
BLUSH = '#F5A8A0'
GOLD_COIN = '#F0D492'

NS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"'


def eye(x, y, rx=13, ry=15):
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{INK}"/>'
            f'<circle cx="{x - rx * 0.35}" cy="{y - ry * 0.4}" r="{rx * 0.42}" fill="#FFFFFF"/>'
            f'<circle cx="{x + rx * 0.3}" cy="{y + ry * 0.35}" r="{rx * 0.16}" fill="#FFFFFF" opacity="0.85"/>')


def blush(x, y, rx=16, ry=9, opacity=0.4):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{BLUSH}" opacity="{opacity}"/>'


def shade(cx, cy, r, color, opacity=0.14):
    """Crescent shade on the lower-right of a round head — quiet volume."""
    return (f'<path d="M {cx - r * 0.1} {cy + r} '
            f'A {r} {r} 0 0 0 {cx + r * 0.86} {cy + r * 0.52} '
            f'A {r * 1.16} {r * 1.16} 0 0 1 {cx - r * 0.1} {cy + r} Z" '
            f'fill="{color}" opacity="{opacity}"/>')


def bandana(cx, y, half_w, knot=True):
    p = [f'<path d="M {cx - half_w} {y - 24} '
         f'Q {cx} {y + 30} {cx + half_w} {y - 24} '
         f'L {cx + half_w} {y + 8} '
         f'Q {cx} {y + 62} {cx - half_w} {y + 8} Z" fill="{BANDANA}"/>']
    p.append(f'<path d="M {cx - half_w} {y - 24} Q {cx} {y + 30} {cx + half_w} {y - 24} '
             f'L {cx + half_w} {y - 8} Q {cx} {y + 12} {cx - half_w} {y - 8} Z" fill="{BANDANA_DK}" opacity="0.45"/>')
    if knot:
        p.append(f'<circle cx="{cx + half_w - 6}" cy="{y + 16}" r="13" fill="{BANDANA_DK}"/>')
        p.append(f'<path d="M {cx + half_w - 6} {y + 22} L {cx + half_w + 44} {y + 52} L {cx + half_w + 6} {y + 66} Z" fill="{BANDANA}"/>')
    return ''.join(p)


def pup_head(cx, cy, r):
    p = []
    # ears first (behind the head): two soft floppy drops
    p.append(f'<path d="M {cx - r * 0.88} {cy - r * 0.52} '
             f'C {cx - r * 1.34} {cy - r * 0.18} {cx - r * 1.30} {cy + r * 0.72} {cx - r * 0.78} {cy + r * 0.86} '
             f'C {cx - r * 0.52} {cy + r * 0.92} {cx - r * 0.48} {cy + r * 0.30} {cx - r * 0.62} {cy - r * 0.10} '
             f'C {cx - r * 0.68} {cy - r * 0.34} {cx - r * 0.76} {cy - r * 0.50} {cx - r * 0.88} {cy - r * 0.52} Z" '
             f'fill="{DOG_EAR}"/>')
    p.append(f'<path d="M {cx + r * 0.88} {cy - r * 0.52} '
             f'C {cx + r * 1.34} {cy - r * 0.18} {cx + r * 1.30} {cy + r * 0.72} {cx + r * 0.78} {cy + r * 0.86} '
             f'C {cx + r * 0.52} {cy + r * 0.92} {cx + r * 0.48} {cy + r * 0.30} {cx + r * 0.62} {cy - r * 0.10} '
             f'C {cx + r * 0.68} {cy - r * 0.34} {cx + r * 0.76} {cy - r * 0.50} {cx + r * 0.88} {cy - r * 0.52} Z" '
             f'fill="{DOG_EAR}"/>')
    # head
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{DOG_TAN}"/>')
    p.append(shade(cx, cy, r, DOG_EAR))
    # top patch — the asymmetric marking that gives the pup character
    p.append(f'<path d="M {cx + r * 0.12} {cy - r} '
             f'A {r} {r} 0 0 1 {cx + r * 0.96} {cy - r * 0.3} '
             f'C {cx + r * 0.5} {cy - r * 0.52} {cx + r * 0.2} {cy - r * 0.72} {cx + r * 0.12} {cy - r} Z" '
             f'fill="{DOG_TAN_DK}" opacity="0.5"/>')
    # muzzle
    p.append(f'<ellipse cx="{cx}" cy="{cy + r * 0.36}" rx="{r * 0.44}" ry="{r * 0.32}" fill="{DOG_CREAM}"/>')
    # eyes + nose + smile
    p.append(eye(cx - r * 0.36, cy - r * 0.08, r * 0.075, r * 0.09))
    p.append(eye(cx + r * 0.36, cy - r * 0.08, r * 0.075, r * 0.09))
    p.append(f'<ellipse cx="{cx}" cy="{cy + r * 0.20}" rx="{r * 0.10}" ry="{r * 0.075}" fill="{INK}"/>')
    p.append(f'<path d="M {cx - r * 0.20} {cy + r * 0.42} Q {cx} {cy + r * 0.55} {cx + r * 0.20} {cy + r * 0.42}" '
             f'fill="none" stroke="{INK}" stroke-width="{max(3.0, r * 0.035)}" stroke-linecap="round"/>')
    p.append(blush(cx - r * 0.62, cy + r * 0.26, r * 0.13, r * 0.075))
    p.append(blush(cx + r * 0.62, cy + r * 0.26, r * 0.13, r * 0.075))
    return ''.join(p)


def cat_head(cx, cy, r):
    p = []
    # ears (behind head)
    for side in (-1, 1):
        ex = cx + side * r * 0.62
        tip_x = cx + side * r * 0.82
        p.append(f'<path d="M {ex - side * r * 0.28} {cy - r * 0.42} '
                 f'C {ex + side * r * 0.02} {cy - r * 1.02} {tip_x + side * r * 0.02} {cy - r * 1.06} {tip_x} {cy - r * 0.30} '
                 f'C {tip_x - side * r * 0.10} {cy - r * 0.16} {ex - side * r * 0.12} {cy - r * 0.30} {ex - side * r * 0.28} {cy - r * 0.42} Z" '
                 f'fill="{CAT_GOLD}"/>')
        p.append(f'<path d="M {ex - side * r * 0.14} {cy - r * 0.46} '
                 f'C {ex + side * r * 0.06} {cy - r * 0.86} {tip_x - side * r * 0.06} {cy - r * 0.84} {tip_x - side * r * 0.08} {cy - r * 0.36} '
                 f'C {tip_x - side * r * 0.16} {cy - r * 0.28} {ex - side * r * 0.02} {cy - r * 0.34} {ex - side * r * 0.14} {cy - r * 0.46} Z" '
                 f'fill="{EAR_PINK}"/>')
    # head
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{CAT_GOLD}"/>')
    p.append(shade(cx, cy, r, CAT_GOLD_DK))
    # forehead stripes
    for off in (-0.36, 0, 0.36):
        sx = cx + off * r
        p.append(f'<path d="M {sx} {cy - r * 0.96} q {off * r * 0.10} {r * 0.18} 0 {r * 0.30}" '
                 f'fill="none" stroke="{CAT_GOLD_DK}" stroke-width="{max(4.0, r * 0.075)}" stroke-linecap="round" opacity="0.7"/>')
    # muzzle
    p.append(f'<ellipse cx="{cx}" cy="{cy + r * 0.34}" rx="{r * 0.46}" ry="{r * 0.32}" fill="{CAT_CREAM}"/>')
    # eyes + nose + w-mouth
    p.append(eye(cx - r * 0.36, cy - r * 0.06, r * 0.08, r * 0.095))
    p.append(eye(cx + r * 0.36, cy - r * 0.06, r * 0.08, r * 0.095))
    p.append(f'<path d="M {cx - r * 0.10} {cy + r * 0.20} L {cx + r * 0.10} {cy + r * 0.20} '
             f'L {cx} {cy + r * 0.30} Z" fill="#C97B4A"/>')
    mw = r * 0.13
    p.append(f'<path d="M {cx - mw} {cy + r * 0.42} Q {cx - mw * 0.5} {cy + r * 0.52} {cx} {cy + r * 0.42} '
             f'Q {cx + mw * 0.5} {cy + r * 0.52} {cx + mw} {cy + r * 0.42}" '
             f'fill="none" stroke="{INK}" stroke-width="{max(3.0, r * 0.035)}" stroke-linecap="round"/>')
    # whiskers
    for side in (-1, 1):
        for i, dy in enumerate((-0.06, 0.04, 0.14)):
            x1 = cx + side * r * (0.52 + i * 0.02)
            x2 = cx + side * r * (0.86 + i * 0.05)
            y1 = cy + r * (0.30 + dy)
            y2 = cy + r * (0.26 + dy * 1.4)
            p.append(f'<path d="M {x1} {y1} Q {(x1 + x2) / 2} {(y1 + y2) / 2} {x2} {y2}" fill="none" '
                     f'stroke="{INK}" stroke-width="{max(2.0, r * 0.022)}" stroke-linecap="round" opacity="0.45"/>')
    p.append(blush(cx - r * 0.60, cy + r * 0.26, r * 0.12, r * 0.07))
    p.append(blush(cx + r * 0.60, cy + r * 0.26, r * 0.12, r * 0.07))
    return ''.join(p)


def chest(cx, top_y, w, color):
    bot = top_y + w * 1.16
    return (f'<path d="M {cx - w} {top_y} '
            f'C {cx - w * 1.05} {top_y + w * 0.62} {cx - w * 0.8} {bot} {cx} {bot} '
            f'C {cx + w * 0.8} {bot} {cx + w * 1.05} {top_y + w * 0.62} {cx + w} {top_y} '
            f'Q {cx} {top_y - w * 0.16} {cx - w} {top_y} Z" fill="{color}"/>')


def svg_wave() -> str:
    """The pup, waving hello — right paw up."""
    p = []
    # body hint
    p.append(chest(300, 470, 150, DOG_TAN))
    # raised waving arm (behind the paw pad)
    p.append(f'<path d="M 408 468 Q 480 430 512 360" fill="none" stroke="{DOG_TAN}" stroke-width="52" stroke-linecap="round"/>')
    p.append('<circle cx="522" cy="336" r="40" fill="' + DOG_TAN + '"/>')
    p.append(f'<circle cx="522" cy="336" r="40" fill="none"/>')
    # paw pads on the raised paw
    p.append(f'<circle cx="512" cy="326" r="8" fill="{DOG_CREAM}" opacity="0.9"/>')
    p.append(f'<circle cx="532" cy="332" r="7" fill="{DOG_CREAM}" opacity="0.9"/>')
    p.append(f'<circle cx="522" cy="348" r="7" fill="{DOG_CREAM}" opacity="0.9"/>')
    # resting arm
    p.append(f'<path d="M 196 470 Q 158 500 150 548" fill="none" stroke="{DOG_TAN}" stroke-width="52" stroke-linecap="round"/>')
    # head + bandana
    p.append(pup_head(300, 330, 148))
    p.append(bandana(300, 452, 108, knot=False))
    # a coin for the finance wink
    p.append(f'<circle cx="536" cy="216" r="34" fill="{GOLD_COIN}"/>')
    p.append(f'<circle cx="536" cy="216" r="23" fill="none" stroke="{BANDANA_DK}" stroke-width="5" opacity="0.45"/>')
    return f'<svg {NS}>{"".join(p)}</svg>'


def svg_duo() -> str:
    """Pup + tabby side by side — the brand pair."""
    p = []
    # chests
    p.append(chest(216, 500, 128, DOG_TAN))
    p.append(chest(446, 512, 116, CAT_GOLD))
    # heads (cat slightly smaller, leaning in)
    p.append(pup_head(216, 350, 132))
    p.append(bandana(216, 462, 96, knot=False))
    p.append(cat_head(452, 372, 118))
    p.append(bandana(452, 476, 86, knot=False))
    # one shared coin between them
    p.append(f'<circle cx="334" cy="196" r="26" fill="{GOLD_COIN}"/>')
    p.append(f'<circle cx="334" cy="196" r="17" fill="none" stroke="{BANDANA_DK}" stroke-width="4" opacity="0.45"/>')
    return f'<svg {NS}>{"".join(p)}</svg>'


def svg_advisor() -> str:
    """The tabby with an idea — paw raised toward a spark."""
    p = []
    p.append(chest(300, 496, 128, CAT_GOLD))
    # raised paw + arm
    p.append(f'<path d="M 402 492 Q 470 452 500 386" fill="none" stroke="{CAT_GOLD}" stroke-width="48" stroke-linecap="round"/>')
    p.append(f'<circle cx="512" cy="362" r="36" fill="{CAT_GOLD}"/>')
    p.append(f'<circle cx="502" cy="352" r="7" fill="{CAT_CREAM}" opacity="0.9"/>')
    p.append(f'<circle cx="522" cy="356" r="6" fill="{CAT_CREAM}" opacity="0.9"/>')
    # the idea: three gold sparks
    p.append(f'<circle cx="520" cy="236" r="30" fill="{GOLD_COIN}"/>')
    p.append(f'<path d="M 520 222 l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 l 10 -4 Z" fill="{BANDANA_DK}" opacity="0.55"/>')
    p.append(f'<circle cx="588" cy="196" r="12" fill="{GOLD_COIN}" opacity="0.8"/>')
    p.append(f'<circle cx="466" cy="188" r="9" fill="{GOLD_COIN}" opacity="0.65"/>')
    # resting arm
    p.append(f'<path d="M 200 496 Q 164 524 158 566" fill="none" stroke="{CAT_GOLD}" stroke-width="48" stroke-linecap="round"/>')
    p.append(cat_head(300, 356, 138))
    p.append(bandana(300, 486, 100, knot=False))
    return f'<svg {NS}>{"".join(p)}</svg>'


def trim_alpha(img: Image.Image, pad: int = 10) -> Image.Image:
    bbox = img.split()[3].getbbox()
    if bbox:
        l = max(bbox[0] - pad, 0)
        t = max(bbox[1] - pad, 0)
        r = min(bbox[2] + pad, img.width)
        b = min(bbox[3] + pad, img.height)
        return img.crop((l, t, r, b))
    return img


def main():
    jobs = [
        ('mascot-wave', svg_wave()),
        ('mascot-duo', svg_duo()),
        ('mascot-advisor', svg_advisor()),
    ]
    for name, svg in jobs:
        raw = os.path.join(ART, f'{name}.svg')
        with open(raw, 'w') as f:
            f.write(svg)
        tmp = os.path.join(ART, f'{name}-raw.png')
        cairosvg.svg2png(bytestring=svg.encode(), write_to=tmp, output_width=640, output_height=640)
        img = trim_alpha(Image.open(tmp).convert('RGBA'))
        img.thumbnail((640, 640), Image.LANCZOS)
        img.save(os.path.join(ART, f'{name}.png'), optimize=True)
        img.save(os.path.join(ASSETS, f'{name}.png'), optimize=True)
        os.remove(tmp)
        print(name, img.size)
    print('MASCOTS OK')


if __name__ == '__main__':
    main()
