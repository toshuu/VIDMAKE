# Google Fonts Pipeline (for X80 reels)

Vendored TTFs only — no network at render time, ever. But fetching the
RIGHT file needs care: we have been burned twice (latin-only file served
for "Inter", latin-only file served for "Noto Sans Devanagari").

## 1. Fetch

Use the **css2 API with a modern UA** — it returns one block per
(subset, weight) with `unicode-range` comments:

```python
import requests, re
ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
css = requests.get(
    'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap',
    headers={'User-Agent': ua}, timeout=30).text
blocks = re.findall(r'/\* (\w[\w-]*) \*/\s*@font-face \{(.*?)\}', css, re.S)
# → [('devanagari', '600'), ('latin-ext', '600'), ('latin', '600'), ...]
```

The legacy **v1 API with a non-browser UA** returns a single TTF per
weight (no subsets). It happened to be `latin` for Inter/Poppins — do NOT
rely on this; it silently served a latin-only file for Noto Sans
Devanagari (missing न/स).

## 2. Subset pick

| Content | Block to download |
|---|---|
| English + `• – — “” ‘’` | `latin` (covers Latin-1: Ñ Ç Ü Ö ★? — ★ U+2605 is NOT Latin-1; verify) |
| Hindi/Devanagari | `devanagari` (U+0900–U+097F) |
| Broad European | `latin` + `latin-ext` (two files, same family) |

## 3. Gate (mandatory — fontTools)

```python
from fontTools.ttLib import TTFont
f = TTFont(path)
cmap = f.getBestCmap()
assert all(c in cmap for c in NEEDED)  # e.g. [0x928, 0x938, 0x2022]
print(f['OS/2'].usWeightClass)  # must equal the requested weight
print(f['name'].getDebugName(4))  # full name sanity
```

Reject on: missing codepoints, wrong `usWeightClass` (Google once served
the same Regular bytes for 600 AND 700), variable `[wght]` files
(engine has no axis control — statics only).

## 4. Register

One alias per family, all weights up front (weight matching verified by
ink-density ladder — 5 distinct steps or the files are wrong):

```js
for (const w of [400, 500, 600, 700, 800])
  registerFontFile(`fonts/Inter-${w}.ttf`, FONT);
```

## 5. Per-family centering probe

Canvas `top` maps to font tables differently per family. Before using a
new family in pills/cards/badges, render a y-ladder (34px pill, 7
offsets) and read pad symmetry numerically. Recorded so far:

| Family | capK in `y = h/2 − size×capK` |
|---|---|
| Inter | 0.32 |
| Poppins | 0.57 |

New family? Probe first, add row, never reuse constants across families.
