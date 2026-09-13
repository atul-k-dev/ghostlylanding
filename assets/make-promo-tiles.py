#!/usr/bin/env python3
"""
Build the two Chrome Web Store promo tiles: 440x280 and 1400x560, 24-bit PNG,
no alpha (an RGBA file is rejected at upload).

Both share the palette and typography of the listing screenshots so the page
reads as one product rather than a set of separately-made images. The previous
tiles were built around the retired coral ghost and a screenshot of the deleted
popup, so these are rebuilds, not resizes.

The small tile is 440x280 and is often rendered smaller still, so it carries
only the icon, the name and one line — anything more is unreadable at that size.
The marquee has room for the pitch and two real panels; the panels are anchored
so they run off the bottom edge, which reads as deliberate and avoids showing
the clipped footer some captures have.

Usage:
    python3 assets/make-promo-tiles.py
"""
from __future__ import annotations

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ICON = 'apps/extension/public/icons/icon-512.png'
FONT = '/System/Library/Fonts/SFNS.ttf'

# Captures used on the marquee. Portrait side-panel shots.
PANELS = [
    ('/Users/sarojkumar/.claude/image-cache/8f10d4dc-f9a1-4798-94ba-313cfe1cb8c0/6.png', (18, 20, 886, 1526)),
    ('/Users/sarojkumar/.claude/image-cache/8f10d4dc-f9a1-4798-94ba-313cfe1cb8c0/7.png', (18, 20, 886, 1526)),
]

BG_A = (240, 247, 255)
BG_B = (198, 221, 250)
INK = (14, 30, 54)
MUTED = (72, 97, 130)
ACCENT = (56, 132, 240)


def sf(size: int, weight: str = 'Regular') -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def gradient(size, a, b) -> Image.Image:
    s = 48
    g = Image.new('RGB', (s, s))
    px = g.load()
    for y in range(s):
        for x in range(s):
            t = x / (s - 1) * 0.45 + y / (s - 1) * 0.55
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return g.resize(size, Image.LANCZOS)


def rounded_mask(size, radius) -> Image.Image:
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def tracked(draw, xy, text, font, fill, tracking) -> None:
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def icon_at(size: int) -> Image.Image:
    return Image.open(ICON).convert('RGBA').resize((size, size), Image.LANCZOS)


def small_tile() -> Image.Image:
    """440x280 — centred, three elements, nothing that dies when scaled down."""
    W, H = 440, 280
    canvas = gradient((W, H), BG_A, BG_B).convert('RGBA')
    d = ImageDraw.Draw(canvas)

    ic = icon_at(84)
    f_name = sf(37, 'Heavy')
    f_line = sf(16, 'Medium')

    name, line = 'Ghostly247', 'Grow your X on autopilot'
    nw = d.textlength(name, font=f_name)
    lw = d.textlength(line, font=f_line)

    block_h = 84 + 18 + 44 + 8 + 20
    y = (H - block_h) // 2

    canvas.paste(ic, ((W - 84) // 2, y), ic)
    y += 84 + 18
    d.text(((W - nw) / 2, y), name, font=f_name, fill=INK)
    y += 44 + 8
    d.text(((W - lw) / 2, y), line, font=f_line, fill=MUTED)

    return canvas.convert('RGB')


def marquee() -> Image.Image:
    """1400x560 — pitch on the left, two real panels running off the bottom."""
    W, H = 1400, 560
    canvas = gradient((W, H), BG_A, BG_B).convert('RGBA')

    # --- panels, right side, staggered, bleeding off the bottom edge ---
    pw = 286
    positions = [(W - pw - 96, 128), (W - pw * 2 - 150, 176)]
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    prepared = []
    for (src, crop), (px, py) in zip(PANELS, positions):
        im = Image.open(src).convert('RGB').crop(crop)
        ph = round(pw * im.height / im.width)
        prepared.append((im.resize((pw, ph), Image.LANCZOS), px, py, ph))
        sd.rounded_rectangle([px + 5, py + 12, px + pw + 5, py + ph + 12], 26,
                             fill=(18, 46, 84, 70))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(20)))
    # Back panel first so the front one overlaps it.
    for im, px, py, ph in reversed(prepared):
        canvas.paste(im, (px, py), rounded_mask((pw, ph), 24))

    d = ImageDraw.Draw(canvas)

    # --- left column ---
    x0 = 96
    col_w = positions[1][0] - x0 - 56

    f_eyebrow = sf(18, 'Semibold')
    f_head = sf(62, 'Heavy')
    f_sub = sf(24, 'Regular')
    f_feat = sf(19, 'Medium')

    head = ['Grow your X', 'while you sleep']
    sub = ['Likes, AI replies, follows and scheduled posts —',
           'in your voice, at a human pace, in your own browser.']
    feats = 'Likes · AI replies · Follows · Reposts · Quotes · Posts'

    for line in head + sub:
        assert d.textlength(line, font=f_head if line in head else f_sub) <= col_w, line

    block_h = 88 + 24 + 26 + 14 + len(head) * 70 + 22 + len(sub) * 34 + 30 + 24
    y = (H - block_h) // 2

    ic = icon_at(88)
    canvas.paste(ic, (x0, y), ic)
    y += 88 + 24

    tracked(d, (x0, y), 'GHOSTLY247', f_eyebrow, ACCENT, 2.6)
    y += 26 + 14

    for line in head:
        d.text((x0, y), line, font=f_head, fill=INK)
        y += 70
    y += 22

    for line in sub:
        d.text((x0, y), line, font=f_sub, fill=MUTED)
        y += 34
    y += 30

    d.text((x0, y), feats, font=f_feat, fill=ACCENT)

    return canvas.convert('RGB')


def main() -> None:
    for build, path in ((small_tile, 'assets/store/promo-tile-440x280.png'),
                        (marquee, 'assets/store/marquee-1400x560.png')):
        im = build()
        im.save(path, 'PNG', optimize=True)
        print(f'wrote {path} {im.size[0]}x{im.size[1]} {im.mode} (no alpha)')


if __name__ == '__main__':
    main()
