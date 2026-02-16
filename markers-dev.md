# Map Marker Scaling & Custom Markers — Brainstorming

## Current State

- **Library:** Leaflet 1.9.4 + React-Leaflet 5.0.0
- **Markers:** Default Leaflet blue teardrop icons (`L.Icon.Default`) — each marker is a separate DOM element
- **Rendering:** Standard DOM-based (no canvas, no WebGL)
- **Popup:** Dark-themed card with thumbnail image, name, city/state, "VIEW DETAILS" link
- **Key files:** `src/components/MapView.tsx`, `src/index.css` (lines 50-101)

---

## 1. Marker Scaling Approaches

### A. Zoom-dependent marker sizing via `zoomend` event
Listen to Leaflet's `zoomend` event and swap marker icons at different zoom thresholds. At country-level zoom, show small dots; at street zoom, show full detailed pins.

- Use `L.DivIcon` with size controlled by a CSS class that changes per zoom bracket
- Must also update `iconAnchor` when size changes (otherwise markers drift off-position)
- Zoom brackets example: `z<6` = 8px dot, `z 6-10` = 16px pin, `z>10` = 24px detailed pin

```tsx
// Conceptual approach in MapMarkers component
const zoom = map.getZoom();
const size = zoom < 6 ? 8 : zoom < 10 ? 16 : 24;
const icon = L.divIcon({
  html: `<svg width="${size}" height="${size}">...</svg>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size],
  className: ''
});
```

**Source:** [Leaflet/Leaflet#3029 — Marker size based on zoom](https://github.com/Leaflet/Leaflet/issues/3029)

### B. CircleMarker instead of Marker
`L.CircleMarker` is SVG-based (derived from `L.Path`, not `L.Marker`). Radius is in pixels so it stays the same screen size at every zoom. Renders via Leaflet's SVG or Canvas renderer.

- **Pros:** Natively uses canvas renderer when enabled (`preferCanvas: true` on MapContainer) — much faster than DOM markers. No icon images to manage. Clean dot aesthetic.
- **Cons:** Loses the "pin" shape. Popups still work but need manual binding. No built-in retina handling.
- **Performance note:** Removing strokes (just filled circles) gives ~50% faster rendering vs stroked circles.

```tsx
<MapContainer preferCanvas={true} ...>
  <CircleMarker center={[lat, lng]} radius={6} pathOptions={{ fillColor: '#c53030', fillOpacity: 0.9, stroke: false }} />
</MapContainer>
```

**Source:** [leaflet-marker-booster](https://github.com/oliverheilig/leaflet-marker-booster)

### C. L.Circle (meters-based) for geo-scaled markers
Unlike CircleMarker (pixels), `L.Circle` radius is in meters — it scales with the map. Useful if you want markers to represent physical area (e.g., a site's footprint).

- **Pros:** Gives geographic context to marker size
- **Cons:** Can become invisible at low zoom; not great for point-of-interest markers
- Probably not appropriate here — landmarks are points, not areas

---

## 2. Custom Marker Icons (non-category-based)

### A. Custom branded SVG pin via DivIcon
Replace the default blue teardrop with a custom Labor Landmarks pin (SVG). Single design, no image files, scales perfectly at any size.

- Inline SVG in `L.divIcon({ html: '...', className: '' })` — no network request, ~1KB
- Can use CSS variables for theming (match the red accent `#c53030`)
- SVG pins are resolution-independent — sharp on retina without `marker-icon-2x.png`

```tsx
const laborIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#c53030"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
  className: ''
});
```

### B. Data URI SVG icon (cached as L.Icon)
Encode SVG as a data URI and use it with standard `L.Icon` instead of `L.DivIcon`. Avoids the DOM overhead of DivIcon while still using SVG.

```tsx
const svgString = `<svg xmlns="..." viewBox="0 0 24 36">...</svg>`;
const svgUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
const icon = L.icon({ iconUrl: svgUrl, iconSize: [24, 36], iconAnchor: [12, 36] });
```

- **Pros:** Standard `L.Icon` behavior (simpler event handling); cacheable
- **Cons:** Can't dynamically style with CSS (it's an image); base64 encoding overhead

**Source:** [Data URI SVG icons with Leaflet (GitHub Gist)](https://gist.github.com/clhenrick/6791bb9040a174cd93573f85028e97af)

### C. Icon caching for performance
When creating DivIcon or Icon instances, cache them in an object/Map to avoid re-creating identical icons on every render.

```tsx
const iconCache = new Map<string, L.DivIcon>();
function getIcon(size: number): L.DivIcon {
  const key = `${size}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({ html: `...`, iconSize: [size, size*1.5] }));
  }
  return iconCache.get(key)!;
}
```

**Source:** [Leaflet maps marker power (Medium)](https://rikdeboer.medium.com/leaflet-maps-marker-fun-games-53d81fdd2f52)

---

## 3. Performance Scaling (rendering strategy)

These matter as the landmark count grows. Current count is in the hundreds — the question is where the ceiling is.

| Approach | Max markers | Effort | Notes |
|----------|-------------|--------|-------|
| **DOM markers (current)** | ~500 | None | Each marker = DOM element. Degrades above a few hundred. |
| **Canvas renderer** | ~5,000 | Low | `preferCanvas: true` on MapContainer. CircleMarkers auto-use it. Custom icons harder. |
| **Leaflet.Canvas-Markers** | ~10,000 | Medium | Plugin renders icon images on canvas. React wrapper: `react-leaflet-canvas-markers`. |
| **Viewport culling** | +50% headroom | Medium | Only render markers within `map.getBounds()`. Remove on pan/zoom. |
| **Leaflet.PixiOverlay (WebGL)** | ~50,000+ | High | Uses Pixi.js for WebGL rendering. Demos show 36K+ animated markers. React wrapper available. |
| **Vector tiles (Mapbox GL)** | 100K+ | Very high | Would mean switching from Leaflet to Mapbox GL JS entirely. |

### Canvas renderer (quick win)
Adding `preferCanvas={true}` to `<MapContainer>` makes all Path-based layers (CircleMarker, Polyline, Polygon) render on a single `<canvas>` instead of individual SVG elements. Doesn't affect `L.Marker` or `L.DivIcon` — those are still DOM.

To benefit: switch from `<Marker>` to `<CircleMarker>` and enable `preferCanvas`.

**Source:** [Optimizing Leaflet Performance (Medium)](https://medium.com/@silvajohnny777/optimizing-leaflet-performance-with-a-large-number-of-markers-0dea18c2ec99)

### Leaflet.Canvas-Markers plugin
Renders standard icon markers on canvas instead of DOM. Works with image-based icons (`L.Icon`), not `L.DivIcon`.

- **npm:** `leaflet-canvas-marker`
- **React wrapper:** `react-leaflet-canvas-markers`

**Source:** [Leaflet.Canvas-Markers (GitHub)](https://github.com/eJuke/Leaflet.Canvas-Markers)

### Leaflet.PixiOverlay (WebGL)
Brings Pixi.js (WebGL) to Leaflet. Can render tens of thousands of markers with smooth 60fps. Falls back to canvas automatically.

- **npm:** `leaflet-pixi-overlay` + `pixi.js`
- **React wrapper:** `react-leaflet-pixi-overlay`
- Demo: 36,700 animated markers at interactive frame rates

**Source:** [Leaflet.PixiOverlay (GitHub)](https://github.com/manubb/Leaflet.PixiOverlay)

### Viewport culling (render only visible markers)
Only render markers within `map.getBounds()`. On `moveend`/`zoomend`, recalculate which landmarks fall inside the viewport.

```tsx
const bounds = map.getBounds();
const visible = landmarks.filter(l => bounds.contains([l.lat, l.lng]));
// Only render <Marker> for `visible` set
```

- **Pros:** Works with any marker type; reduces DOM at any zoom
- **Cons:** Markers pop in/out during pan; need debouncing
- Can combine with any other approach

**Source:** [High-Performance Map Visualizations in React (Andrej Gajdos)](https://andrejgajdos.com/leaflet-developer-guide-to-high-performance-map-visualizations-in-react/)

---

## 4. Interactive Enhancements

### A. Hover tooltips
Show landmark name on hover using `<Tooltip>` from react-leaflet. Lightweight, ~10 lines of code.

```tsx
<Marker ...>
  <Tooltip direction="top" offset={[0, -20]}>{landmark.name}</Tooltip>
  <Popup>...</Popup>
</Marker>
```

- Works on desktop; gracefully ignored on mobile (no hover)

### B. Selected-marker highlight
When a landmark is selected from the sidebar list or search, swap that marker's icon to an enlarged/highlighted version. Pass `selectedLandmarkId` into `MapMarkers` and conditionally use a different icon.

### C. Animated pulse on selection
CSS animation on a `DivIcon` — a pulsing ring around the selected marker.

```css
@keyframes marker-pulse {
  0% { box-shadow: 0 0 0 0 rgba(197, 48, 48, 0.6); }
  100% { box-shadow: 0 0 0 16px rgba(197, 48, 48, 0); }
}
```

### D. Search result dimming
When filtering, set `opacity={0.25}` on non-matching markers instead of removing them — keeps spatial context visible.

---

## 5. Alternative Tile Styles

### A. CartoDB Dark Matter (recommended)
Replace the CSS-inverted OSM tiles with a natively dark tile set. Removes the `filter: invert(100%) hue-rotate(180deg)` hack in `index.css`.

```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

- **Pros:** Cleaner rendering, better label readability, no color distortion artifacts
- **Cons:** External tile provider (CartoDB/CARTO), different visual style

### B. Stamen Toner
High-contrast black-and-white. Good for data-viz-forward aesthetic.

### C. User-selectable tile layers
Add a Leaflet layers control letting users switch between dark/light/satellite.

---

## Summary: Recommended Path

For the current scale (hundreds of landmarks) and Leaflet stack:

1. **Custom SVG DivIcon pin** — branded, resolution-independent, themed to match the app
2. **Zoom-dependent sizing** — small dots at country zoom, full pins at city zoom
3. **Icon caching** — avoid re-creating icon instances on every render
4. **Hover tooltips** — near-zero effort, big UX win on desktop
5. **CartoDB Dark Matter tiles** — remove the CSS invert hack

If/when the dataset grows past ~500 landmarks:
6. **Canvas renderer + CircleMarker** or **Leaflet.Canvas-Markers** plugin
7. **Viewport culling** as an easy add-on to any approach
