#!/usr/bin/env python3
"""
Build a Chrome Web Store listing screenshot from a capture of the Ghostly247 UI.

The store wants 1280x800 (or 640x400), JPEG or 24-bit PNG, and **no alpha** — an
RGBA file is rejected at upload, which is the single easiest mistake to make when
exporting from a screenshot tool.

A side-panel capture is portrait (~868x1506), so it can never fill a landscape
frame on its own. Padding it with dead space looks like an accident; instead the
capture sits full-height on one side and a text column carries the message, which
is the standard store treatment and makes the remaining space deliberate.

Colours are the panel's own blues so the artwork and its ground read as one
surface. Nothing here invents a claim: pass copy that is true of the screen.

Usage
-----
  python3 assets/make-store-screenshot.py \
      --src ~/captures/home.png \
      --out assets/store/screenshot-2-home.png \
      --headline "See what it did|while you slept" \
      --sub "Every like, reply and follow, with the post it acted on." \
      --bullet "Live daily counters" \
      --bullet "Full activity log" \
      --bullet "It tells you why it is idle"

`--headline` splits on "|" so line breaks stay deliberate rather than greedy —
a one-word orphan on the second line is the first thing the eye catches.
Use `--side left` to put the capture on the left instead.
"""
from __future__ import annotations

import argparse
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 800
ICON = 'apps/extension/public/icons/icon-512.png'
FONT = '/System/Library/Fonts/SFNS.ttf'

BG_A = (240, 247, 255)
BG_B = (198, 221, 250)
INK = (14, 30, 54)
MUTED = (72, 97, 130)
ACCENT = (56, 132, 240)

PANEL_H = 704
MARGIN = 88
DARK_THRESHOLD = 90


def sf(size: int, weight: str = 'Regular') -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def gradient(size: tuple[int, int], a, b) -> Image.Image:
    """Soft diagonal wash — built small and scaled up so it stays band-free."""
    s = 48
    g = Image.new('RGB', (s, s))
    px = g.load()
    for y in range(s):
        for x in range(s):
            t = x / (s - 1) * 0.45 + y / (s - 1) * 0.55
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return g.resize(size, Image.LANCZOS)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def trim_window_chrome(im: Image.Image) -> Image.Image:
    """
    Drop the dark window border a screen capture usually carries, by finding the
    first row/column from each edge that is not mostly dark. A capture with no
    such border is returned untouched.
    """
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()

    def row_dark(y): return sum(1 for x in range(w) if sum(px[x, y]) / 3 < DARK_THRESHOLD) / w
    def col_dark(x): return sum(1 for y in range(h) if sum(px[x, y]) / 3 < DARK_THRESHOLD) / h

    try:
        top = next(y for y in range(h) if row_dark(y) < 0.5)
        bottom = next(y for y in range(h - 1, -1, -1) if row_dark(y) < 0.5)
        left = next(x for x in range(w) if col_dark(x) < 0.5)
        right = next(x for x in range(w - 1, -1, -1) if col_dark(x) < 0.5)
    except StopIteration:
        return rgb
    return rgb.crop((left, top, right + 1, bottom + 1))


def wrap(draw, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ''
    for word in words:
        trial = f'{cur} {word}'.strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def tracked(draw, xy, text: str, font, fill, tracking: float) -> None:
    """Letter-spaced text — PIL has no tracking, so step glyph by glyph."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def build(args: argparse.Namespace) -> Image.Image:
    canvas = gradient((W, H), BG_A, BG_B).convert('RGBA')

    panel = trim_window_chrome(Image.open(args.src))
    pw = round(PANEL_H * panel.width / panel.height)
    if pw > W // 2:
        sys.exit(f'capture is too wide ({panel.width}x{panel.height}); '
                 'this layout expects a portrait panel capture')
    panel = panel.resize((pw, PANEL_H), Image.LANCZOS)

    py = (H - PANEL_H) // 2
    px = MARGIN if args.side == 'left' else W - pw - MARGIN

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [px + 6, py + 14, px + pw + 6, py + PANEL_H + 14], 30, fill=(18, 46, 84, 78))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(22)))
    canvas.paste(panel, (px, py), rounded_mask((pw, PANEL_H), 26))

    d = ImageDraw.Draw(canvas)
    x0 = px + pw + 72 if args.side == 'left' else MARGIN
    col_w = (W - x0 - MARGIN) if args.side == 'left' else (px - x0 - 72)

    f_eyebrow, f_head = sf(17, 'Semibold'), sf(60, 'Heavy')
    f_sub, f_bullet = sf(25, 'Regular'), sf(23, 'Medium')

    head_lines = [l.strip() for l in args.headline.split('|') if l.strip()]
    too_wide = [l for l in head_lines if d.textlength(l, font=f_head) > col_w]
    if too_wide:
        sys.exit(f'headline line does not fit {col_w}px: {too_wide[0]!r} — '
                 'split it differently with "|"')
    sub_lines = wrap(d, args.sub, f_sub, col_w) if args.sub else []

    head_lh, sub_lh, bul_lh = 68, 36, 44
    block_h = (76 + 26) + (26 + 12) + len(head_lines) * head_lh
    if sub_lines:
        block_h += 18 + len(sub_lines) * sub_lh
    if args.bullet:
        block_h += 30 + len(args.bullet) * bul_lh
    y = (H - block_h) // 2

    icon = Image.open(ICON).convert('RGBA').resize((76, 76), Image.LANCZOS)
    canvas.paste(icon, (x0, y), icon)
    y += 76 + 26

    tracked(d, (x0, y), 'GHOSTLY247', f_eyebrow, ACCENT, 2.4)
    y += 26 + 12

    for line in head_lines:
        d.text((x0, y), line, font=f_head, fill=INK)
        y += head_lh

    if sub_lines:
        y += 18
        for line in sub_lines:
            d.text((x0, y), line, font=f_sub, fill=MUTED)
            y += sub_lh

    if args.bullet:
        y += 30
        for b in args.bullet:
            cy = y + 11
            d.ellipse([x0, cy - 9, x0 + 18, cy + 9], fill=ACCENT)
            d.line([(x0 + 5, cy), (x0 + 8, cy + 4), (x0 + 13, cy - 4)],
                   fill=(255, 255, 255), width=2, joint='curve')
            d.text((x0 + 32, y), b, font=f_bullet, fill=INK)
            y += bul_lh

    return canvas.convert('RGB')   # 24-bit, no alpha — the store requires it


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', required=True, help='portrait capture of the panel')
    ap.add_argument('--out', required=True, help='output PNG (1280x800, no alpha)')
    ap.add_argument('--headline', required=True, help='lines split on "|"')
    ap.add_argument('--sub', default='', help='one supporting sentence')
    ap.add_argument('--bullet', action='append', default=[],
                    help='repeatable; three reads best')
    ap.add_argument('--side', choices=('left', 'right'), default='right',
                    help='which side the capture sits on (default right)')
    args = ap.parse_args()

    out = build(args)
    out.save(args.out, 'PNG', optimize=True)
    print(f'wrote {args.out} {out.size[0]}x{out.size[1]} {out.mode} (no alpha)')


if __name__ == '__main__':
    main()
