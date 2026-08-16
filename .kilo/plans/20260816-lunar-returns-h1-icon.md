# Replace moon emoji with image in LunarReturns h1

## Context
- `LunarReturns/index.html:68` contains `<h1>🌙 Lunar Returns</h1>`.
- The file `LunarReturns/1f319.webp` exists (the 🌙 emoji as WebP), so a relative path works.

## Change
In `LunarReturns/index.html`, replace line 68:

```html
<h1>🌙 Lunar Returns</h1>
```

with:

```html
<h1><img src="1f319.webp" alt="🌙" width="24" height="24" style="vertical-align:-3px;"> Lunar Returns</h1>
```

Notes:
- `alt="🌙"` keeps the emoji as fallback text if the image fails to load and for screen readers.
- `width/height="24"` roughly matches the `h1` font-size of 1.4em and avoids layout shift; `vertical-align:-3px` visually aligns the icon with the text baseline.
- Relative path `1f319.webp` (same directory as `index.html`) — no other files affected.

## Validation
- Open `LunarReturns/index.html` in a browser: the moon icon renders before "Lunar Returns", aligned with the text.
- Verify no other `🌙` references in the file need updating (currently none besides the h1).
