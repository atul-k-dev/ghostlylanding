# Assets

Marketing and store artwork. Nothing here is bundled into the extension — the
icons that ship inside the build live in `apps/extension/public/icons/`.

## `store/` — Chrome Web Store listing

Uploaded by hand in the Developer Dashboard. The dimensions are fixed by Google
and a file of the wrong size is rejected at upload, so the sizes are in the
filenames deliberately.

| File | Size | Where it appears |
| --- | --- | --- |
| `icon-128.png` | 128×128 | Store icon |
| `promo-tile-440x280.png` | 440×280 | Small promo tile |
| `marquee-1400x560.png` | 1400×560 | Marquee promo tile |
| `screenshot-1-sign-in.png` … `-5-…` | 1280×800 | Listing screenshots, shown in filename order |

## `raw-captures/` — unpadded originals

The source screen captures the store screenshots were exported from, at their
native window sizes (~960–1210px). Kept so the 1280×800 exports can be redone
without re-shooting the UI.

Each raw capture maps to the store screenshot of the same name.

> **These are stale.** They were taken from v0.0.1 in June 2026. The popup has
> since gained the Growth, Review and Schedule tabs, and the store listing still
> shows a three-tab UI that no longer matches what users install. Re-shoot before
> the next listing update.
