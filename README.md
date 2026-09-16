# SKÅDIS board generator

Generates SKÅDIS-compatible pegboard SVGs for Shaper Origin / Shaper Studio, with a cut plan (bit, spindle, feed, passes).

## Run

Open `index.html` in a browser. No build step or dependencies (Google Fonts load from the web; system fallbacks otherwise).

Or serve it locally:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Files

- `index.html` markup and controls
- `styles.css` layout and theme tokens (light/dark)
- `app.js` geometry, SVG export, cut plan, unit toggle

## Spec used

- Slots 5 × 15 mm, 40 mm grid, staggered 20 mm both ways
- Stock ~5 mm for IKEA accessory fit

## Shaper encoding

- Units: SVG exported in mm (`width="…mm"`, viewBox in mm)
- Inside cut: black stroke, white fill
- Outside cut: black stroke, black fill
- Guide: blue stroke
- Custom anchor: red-filled right triangle, no stroke; right-angle vertex = anchor, short leg = X, long leg = Y
- Depth: `xmlns:shaper="http://www.shapertools.com/namespaces/shaper"` and `shaper:cutDepth="Nmm"` on each cut path

## Notes

- Internal state is always millimeters; the unit toggle only changes display.
- `app.js` uses `claude.use("downloads")` when hosted on claude.ai and falls back to a normal Blob download locally.
- Feeds and speeds: 1/4 in values from Shaper's materials table (dial 5, 10 in/min, 1/4 in per pass); 1/8 in values are scaled estimates.
