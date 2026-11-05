# Goo Account Router: brand and logo

Status: **agreed** (2026-11-03). Master: `brand/logo.svg`. 16 px variant: `brand/logo-16.svg`.
To regenerate every PNG, run `python3 brand/build-icons.py` (needs `rsvg-convert` and Pillow).

---

## 1. How we got here: brand × design dialogue

The brand perspective (from the `brand` skill: identity, consistency, compliance) and the design perspective (from the `designnn` skill: logo and icon craft) each wrote a position, critiqued the other, and converged.

### 1.1 Brand brief (brand)

- **What it is.** A small, quiet utility. You are signed in to several Google accounts. Each Google service (Gmail, Drive, YouTube, Calendar…) opens in the account you picked for it. Under the hood it rewrites the URL with `?authuser=`.
- **Core idea to show:** *routing*. One input fans out into several account lanes, and one lane is the chosen one.
- **Personality:** precise, calm, trustworthy, a bit nerdy. A switchboard rather than a mascot. It should feel like a tool you install and forget.
- **Non-negotiable: do not look like Google.** The name avoids "Google" on purpose. Chrome Web Store and App Store review reject impersonation. So: no blue/red/yellow/green set, no "G" letterform, no Google shapes (pin, multicolour ring, envelope-M, triangle play button).
- **Where the icon lives:** a 16 px toolbar slot in light *and* dark browser themes. That is the size that matters. Store tiles and the 1024 app icon come second.
- **Equity we already have:** the popup's accent `#1f4099` (deep indigo) and the account-dot colours `#1f4099 #c2410c #0f766e #7e22ce`.
- **Ask:** one tile shape, at most 2 colours plus white, no text.

### 1.2 Design proposal (designnn): three concepts

| # | Concept | Description | Strength | Risk |
|---|---------|-------------|----------|------|
| A | **Fork / lanes** | Indigo rounded tile. A white input node on the left feeds a stem that splits into three curved lanes, each ending in a node. | Says "one in, many out" directly. A bold silhouette. | Could read as a generic "share" or git-branch glyph. Curves blur at 16 px. |
| B | **Selector dots** | A column of account dots in the four popup colours, with a chevron pointing at one. | Ties into the popup UI. "Pick an account" is very literal. | Four colours on one tile. Loose dots turn to mush at 16 px. |
| C | **Monogram "R"** | An "R" whose leg splits into lanes. | Ownable letterform. | The letter fights the forks at 16 px. A letter mark next to "Goo" invites "where is the G?" comparisons. |

### 1.3 Critique round

**Brand → design**
- *On B:* four saturated dots on one tile is the exact visual rhythm of Google's four-colour identity, even with different hues. Reviewers and users pattern-match on "several bright dots = Google". Rejected on compliance grounds, not taste.
- *On C:* letter marks are fine in principle, but an "R" adds nothing the name doesn't already say. It is also the weakest of the three at 16 px. Rejected.
- *On A:* right story, but it only says "splits". The product's point is that **one** lane is chosen per service. Show the choice.

**Design → brand**
- "Show the choice" can't mean colouring every lane: we are capped at 2 colours plus white. One accent, used on exactly one node, is the whole budget.
- The accent can't be the popup's `#c2410c`. On the indigo tile it is about 1.8:1 and turns to mud at 16 px. A lighter step on the same hue, `#f97316`, reaches 3.33:1 against `#1f4099`. That clears WCAG 1.4.11's 3:1 for graphical objects and keeps the family link to the popup's orange.
- Blue plus orange is a complementary pair, not Google's set. Two hues can't be read as the four-colour mark.
- At 16 px curves are blurry anti-aliasing. The small size needs its own pixel-grid drawing: the same parts (input node, spine, three lanes, chosen lane) with the curves straightened.

**Brand → design (follow-up)**
- Agreed, if the 16 px variant keeps the same parts in the same places. The chosen lane is always the **top** lane, in every size, so it becomes a recognisable asymmetry.
- The tile stays `#1f4099` so the toolbar icon, popup header and buttons read as one product.

### 1.4 Decision

**Concept A+, "the routed lane".** An indigo rounded-square tile holds a white routing glyph. One input node on the left feeds a stem that fans into three account lanes. The top lane ends in a Signal Orange node: the account this service gets routed to. At 16 px a pixel-grid version keeps the same parts with straight lines.

---

## 2. Logo assets

| File | What | Notes |
|------|------|-------|
| `brand/logo.svg` | Master vector, 96×96 tile | Use for 32 px and up |
| `brand/logo-16.svg` | 16 px pixel-grid variant | Use only at 16 px |
| `src/icons/16.png` | Toolbar icon | From `logo-16.svg`, full bleed |
| `src/icons/32.png`, `48.png` | Toolbar @2x, extensions page | From `logo.svg`, full bleed |
| `src/icons/128.png` | Store / install icon | 96×96 artwork centred with 16 px transparent padding (Chrome guidance) |
| `brand/icon-1024.png` | Safari / App Store app icon | Opaque, full-bleed square with no corner rounding (the OS applies its own mask), glyph at 92 % of the tile |
| `brand/promo-440x280.png` | Chrome Web Store small promo tile | Indigo field, glyph, wordmark "Goo Account Router", orange rule |
| `brand/preview-light.png`, `preview-dark.png` | QA sheets | All sizes on white, Chrome-light `#f1f3f4`, grey, Chrome-dark `#202124`, `#35363a`, black |
| `brand/build-icons.py` | Regenerates every PNG above | |

### Construction (master, 96 grid)
- Tile: 96×96, corner radius 22.
- Lanes: stroke 9, round caps. Input node r 9 at (21, 48). Lane-end nodes r 10 at x 72, y 24 / 48 / 72.
- Chosen node: top lane (72, 24), Signal Orange.

---

## 3. Colour

| Role | Name | Hex | Use |
|------|------|-----|-----|
| Primary | Router Indigo | `#1f4099` | Icon tile, popup accent, promo background |
| Accent | Signal Orange | `#f97316` | **Only** the chosen-lane node, plus one small rule in marketing layouts |
| Neutral | White | `#ffffff` | Glyph (input, stem, lanes, unchosen nodes) |
| UI ink (popup) | Ink | `#17203a` | Text next to the logo on light backgrounds |

Popup account dots (`#1f4099 #c2410c #0f766e #7e22ce`) are **UI data colours**, not brand colours. Never put them in the logo.

Contrast check:
- White glyph on indigo: 9.33:1.
- Orange on indigo: 3.33:1 (passes 3:1 for graphics).
- Indigo tile on the Chrome dark toolbar: 1.73:1 on `#202124`, 1.29:1 on `#35363a`. Low, so on dark themes the white glyph carries the icon. That is why the glyph has to stay heavy (the dark preview confirms it reads).

---

## 4. Usage rules

1. Always show the glyph on the indigo tile in app and extension icons. The bare glyph (white and orange, no tile) is allowed only on an indigo field, as in the promo tile.
2. 16 px uses `logo-16.svg`. Everything 32 px and up uses `logo.svg`. Never downscale the master to 16.
3. The chosen node is always the **top** lane and always Signal Orange. Exactly one orange element per mark.
4. Clear space around the tile: at least ¼ of the tile width (more on the store icon, where it's fixed at 16 px of 128).
5. Wordmark: "Goo Account Router" in the system sans (Helvetica Neue / SF / Segoe UI), bold, sentence-case words, white on indigo or Ink on light.
6. In copy, refer to Google only descriptively ("works with your Google accounts"). Never make it part of the mark or wordmark.

## 5. Do / Don't

**Do**
- Keep the tile Router Indigo and the glyph white.
- Use the 16 px variant in the toolbar.
- Regenerate PNGs from the SVGs with `build-icons.py` rather than hand-editing rasters.
- Check new assets on both a light and a dark background before shipping.

**Don't**
- Add red, yellow or green, or any third hue. Never combine blue, red, yellow and green.
- Draw a "G", or any Google product shape (multicolour ring, envelope, pin, play triangle).
- Colour the lanes in the popup's four account colours.
- Recolour the tile, add gradients, shadows, outlines or transparency.
- Move the orange to a different lane, add a second orange node, or mirror the glyph.
- Put text inside the icon at any size.
- Stretch, rotate, or crop the tile.
