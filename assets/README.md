# Assets

Marketing and store artwork. Nothing here is bundled into the extension — the
icons that ship inside the build live in `apps/extension/public/icons/`.

## `store/` — Chrome Web Store listing

Uploaded by hand in the Developer Dashboard. The dimensions are fixed by Google
and a file of the wrong size is rejected at upload, so the sizes are in the
filenames deliberately.

| File | Size | Where it appears |
| --- | --- | --- |
| `icon-128.png` | 128×128 | Store icon — **upload this one**. 96×96 of artwork centred in a 128×128 transparent canvas, which is what Google's image guidelines ask for ("an additional 16 pixels per side should be transparent padding"). |
| `icon-128-fullbleed.png` | 128×128 | Same icon with the artwork filling all 128px. Not guideline-shaped, but it reads larger in a crowded listing. Alternative, not the default. |
| `promo-tile-440x280.png` | 440×280 | Small promo tile — icon, name, one line. Rendered small, so nothing more fits. |
| `marquee-1400x560.png` | 1400×560 | Marquee promo tile — pitch plus two real panels, bled off the bottom edge. |
| `screenshot-1-sign-up.png` … `-5-…` | 1280×800 | Listing screenshots, shown in filename order. **24-bit PNG, no alpha** — an RGBA file is rejected at upload. |

All of `store/` was rebuilt on 2026-09-12 for v3.0.0 around the current blue
icon. The coral-and-black ghost, and the three-tab popup the old marquee showed,
are both retired — don't reintroduce them from an old file.

## `raw-captures/` — v0.0.1 originals (historical)

These are from v0.0.1 (June 2026) and show the deleted popup. Kept only as a
record; the current screenshots are built from fresh side-panel captures via the
script below, not from these.

The source screen captures the store screenshots were exported from, at their
native window sizes (~960–1210px). Kept so the 1280×800 exports can be redone
without re-shooting the UI.

Each raw capture maps to the store screenshot of the same name.

## Rebuilding the screenshots

`make-store-screenshot.py` turns a portrait capture of the side panel into a
1280×800, 24-bit, alpha-free listing screenshot: it trims the dark window chrome
off the capture, sets it full-height on one side over a wash of the panel's own
blues, and sets the message in the other column.

```
python3 assets/make-store-screenshot.py \
    --src ~/captures/growth.png \
    --out assets/store/screenshot-4-growth.png \
    --side left \
    --headline "What it did|and what it got" \
    --sub "A follower reading every day, and how each reply performed." \
    --bullet "Follower trend, labelled with the span it covers"
```

`--headline` splits on `|` so the break is deliberate; the script refuses a line
too wide for the column rather than letting it collide with the panel. Alternate
`--side` between shots so the listing has some rhythm. Only pass copy that is
true of the screen in the capture.

## Regenerating the store icon

Both 128px icons are derived from `apps/extension/public/icons/icon-512.png` (the master) with Lanczos downscaling — never by re-scaling a smaller copy. The master is a full-bleed squircle with transparent corners, so no rounding is applied here: the PNG keeps its alpha, and the store only wraps an icon in its own 12px-radius frame when the image has *no* alpha.

> **The promo tile and marquee are also stale**, in two ways: both still show the old coral-and-black ghost that the app no longer uses, and `marquee-1400x560.png` shows the deleted three-tab popup (Home / Activity / Settings) with obsolete cap numbers. Rebuild both around the current blue icon before the next listing update.
>
> **The screenshots are stale.** They were taken from v0.0.1 in June 2026. The popup has
> since gained the Growth, Review and Schedule tabs, and the store listing still
> shows a three-tab UI that no longer matches what users install. Re-shoot before
> the next listing update.

## Rebuilding the promo tiles

```
python3 assets/make-promo-tiles.py
```

Writes both tiles at once so they can't drift apart. The panels it composites
are named at the top of the script — point them at fresh captures when the UI
moves on.
