#!/usr/bin/env python3
"""
v4.4.0 — bank logo normalization.

The 22 brand tiles were drawn by different sources: some are edge-to-edge
squircles, others carry wide transparent margins and their own corner radii,
so at equal render sizes they look uneven (a huge black Maya blob next to a
tiny Grab bag in a white square).

This script makes every asset identical in shape:
  1. crop to the tile's alpha bounding box (kills baked-in margins)
  2. square-pad + resize to 256x256
  3. re-round every corner to ONE uniform radius (56/256 = iOS-like 21.9%)
  4. save optimized

Run from the repo root:  python3 scripts/logo_normalize.py
"""
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'banks')
SIZE = 256
RADIUS = 56  # px at 256 — uniform squircle for every brand


def normalize(path: str) -> None:
    img = Image.open(path).convert('RGBA')
    bbox = img.getchannel('A').getbbox()
    if bbox:
        img = img.crop(bbox)

    # square-pad, centered
    side = max(img.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    img = canvas.resize((SIZE, SIZE), Image.LANCZOS)

    # one uniform corner radius for every brand
    mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=RADIUS, fill=255)
    img.putalpha(mask)

    img.save(path, optimize=True)
    print(f'normalized {os.path.basename(path)}')


def main() -> None:
    for f in sorted(os.listdir(SRC)):
        if f.endswith('.png'):
            normalize(os.path.join(SRC, f))


if __name__ == '__main__':
    main()
