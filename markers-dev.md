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

---

## 6. React-Leaflet Scaling Optimizations (Discussion)

### The Core Problem: DivIcon Remounting

When you change the `icon` prop on a React-Leaflet `<Marker>`, Leaflet removes the old DOM element and creates a new one. This **breaks CSS transitions** entirely—you can't animate between sizes because the element is destroyed.

**Implications:**
- Zoom-dependent icon swapping (Section 1A) causes markers to "pop" rather than smoothly transition
- Any approach that creates a *new* `L.divIcon` instance on zoom change will remount

### Solution: CSS Transform Scaling (No Remount)

Instead of swapping icons, use a **single DivIcon** and scale it with `transform: scale()`:

```tsx
// Use a single icon size, scale with CSS
const baseIcon = useMemo(() => L.divIcon({
  html: `<div class="labor-marker"><svg>...</svg></div>`,
  iconSize: [24, 36],       // Base size (never changes)
  iconAnchor: [12, 36],
  className: ''
}), []);

// On zoom change, apply CSS scale factor to marker elements
useMapEvents({
  zoom: () => {   // 'zoom' fires DURING animation, 'zoomend' fires AFTER
    const z = map.getZoom();
    const scale = z < 6 ? 0.5 : z < 10 ? 0.75 : 1;
    document.documentElement.style.setProperty('--marker-scale', String(scale));
  }
});
```

```css
.labor-marker {
  transform: scale(var(--marker-scale, 1));
  transform-origin: bottom center;
  transition: transform 0.15s ease-out;
  will-change: transform;   /* GPU compositing hint */
}
```

**Why this works:**
- DOM element stays the same → CSS transition works
- `zoom` event syncs with Leaflet's zoom animation
- GPU-accelerated via `will-change` + `transform`

### React Memoization Strategy

Prevent unnecessary re-renders that cause remounting:

```tsx
// Memoize the icon instance (stable reference)
const laborIcon = useMemo(() => L.divIcon({ ... }), []);

// Memoize the entire Marker to prevent React unmounting
const MemoizedMarker = React.memo(({ landmark }: { landmark: Landmark }) => (
  <Marker position={[landmark.lat, landmark.lng]} icon={laborIcon}>
    <Popup>...</Popup>
  </Marker>
));

// In parent: stable keys prevent unmount/remount
{landmarks.map(l => <MemoizedMarker key={l.id} landmark={l} />)}
```

### When You Must Swap Icons (Discrete Thresholds)

If you need fundamentally different icons at different zooms (e.g., dot → pin → detailed pin), use **opacity crossfade** to smooth the swap:

```css
.labor-marker {
  opacity: 1;
  transition: opacity 0.2s ease-out, transform 0.15s ease-out;
}

.labor-marker--swapping {
  opacity: 0;
}
```

```tsx
// Briefly set swapping class, swap icon, remove class
// This creates a fade-out → swap → fade-in effect
```

### Performance Hints

| Technique | Use When | Caution |
|-----------|----------|---------|
| `will-change: transform` | Markers that animate | Don't apply to all elements; uses GPU memory |
| `transform: translateZ(0)` | Force GPU layer | Same as above |
| `contain: layout style` | Prevent reflow | May affect popup positioning |

### When to Avoid These Optimizations

- **< 100 markers**: The overhead of CSS variables and memoization may not be worth it
- **Static zoom levels**: If users rarely zoom, discrete icon swapping with `zoomend` is simpler
- **CircleMarker path**: If switching to `<CircleMarker>` + `preferCanvas`, DOM optimizations become irrelevant

### Verdict: Recommended Hybrid Approach

For Labor Landmarks (hundreds of markers, interactive zooming, custom branded pins):

1. **Single DivIcon + CSS transform scale** — smooth zoom, no remounting
2. **`React.memo` + `useMemo`** — prevent React churn
3. **`zoom` event** — sync with Leaflet animation
4. **`will-change: transform`** — GPU hint on marker class
5. **Keep `zoomend` as fallback** — for final adjustments after animation completes

This balances safety (minimal changes to existing approach) with performance (smooth scaling, memoization).

---

## Implementation Plan

### Phase 1: Foundation (Do First)

| Step | Task | Files | Est. Effort |
|------|------|-------|-------------|
| 1.1 | **Create branded SVG DivIcon** | `MapMarkers.tsx`, `index.css` | 1 hr |
| | Single red pin SVG, 24×36 base size, `#c53030` fill | | |
| 1.2 | **Memoize icon instance** | `MapMarkers.tsx` | 15 min |
| | `const laborIcon = useMemo(() => L.divIcon({...}), [])` | | |
| 1.3 | **Memoize Marker components** | `MapMarkers.tsx` | 30 min |
| | `React.memo()` wrapper, stable `key={landmark.id}` | | |
| 1.4 | **Add marker CSS class** | `index.css` | 15 min |
| | `.labor-marker { transform-origin: bottom center; }` | | |

**Deliverable:** Custom branded markers, no performance regression, ready for scaling.

---

### Phase 2: Smooth Zoom Scaling

| Step | Task | Files | Est. Effort |
|------|------|-------|-------------|
| 2.1 | **Add CSS variable for scale** | `index.css` | 10 min |
| | `:root { --marker-scale: 1; }` | | |
| 2.2 | **Add transform + transition** | `index.css` | 10 min |
| | `.labor-marker { transform: scale(var(--marker-scale)); transition: transform 0.15s ease-out; will-change: transform; }` | | |
| 2.3 | **Hook into `zoom` event** | `MapMarkers.tsx` | 30 min |
| | `useMapEvents({ zoom: () => { ... set --marker-scale ... } })` | | |
| 2.4 | **Define scale brackets** | `MapMarkers.tsx` | 15 min |
| | `z<6 → 0.5`, `z 6-10 → 0.75`, `z>10 → 1.0` | | |

**Deliverable:** Markers scale smoothly during zoom animation, no "popping".

---

### Phase 3: UX Polish

| Step | Task | Files | Est. Effort |
|------|------|-------|-------------|
| 3.1 | **Add hover tooltips** | `MapMarkers.tsx` | 20 min |
| | `<Tooltip direction="top">{landmark.name}</Tooltip>` | | |
| 3.2 | **Selected marker highlight** | `MapMarkers.tsx`, `index.css` | 30 min |
| | Conditional larger icon or pulse animation for selected landmark | | |
| 3.3 | **Switch to CartoDB Dark Matter tiles** | `MapView.tsx` | 10 min |
| | Remove CSS `filter: invert()` hack | | |

**Deliverable:** Polished UX with tooltips, selection feedback, clean dark tiles.

---

### Phase 4: Future Scale (When Needed)

Only implement if marker count exceeds ~500 or performance degrades:

| Step | Task | Trigger |
|------|------|---------|
| 4.1 | **Viewport culling** | > 300 markers visible at once |
| | Filter to `map.getBounds().contains()` on `moveend` | |
| 4.2 | **Switch to CircleMarker + preferCanvas** | > 500 markers, willing to lose pin shape |
| 4.3 | **Leaflet.Canvas-Markers plugin** | > 1000 markers, need custom icons |
| 4.4 | **Supercluster clustering** | Dense marker overlap at low zoom |

---

### Decision Log

| Decision | Rationale |
|----------|-----------|
| **CSS transform scaling over icon swapping** | Avoids DOM remounting, enables CSS transitions |
| **`zoom` event over `zoomend`** | Syncs with Leaflet's zoom animation |
| **`useMemo` + `React.memo`** | Prevents React re-render churn |
| **`will-change: transform`** | GPU compositing hint (used sparingly) |
| **Defer canvas/WebGL** | Current scale (hundreds) doesn't require it |

---

### Code Skeleton

```tsx
// MapMarkers.tsx
import { useMemo } from 'react';
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const SCALE_BRACKETS = [
  { maxZoom: 6, scale: 0.5 },
  { maxZoom: 10, scale: 0.75 },
  { maxZoom: Infinity, scale: 1.0 },
];

function getScale(zoom: number): number {
  return SCALE_BRACKETS.find(b => zoom < b.maxZoom)?.scale ?? 1;
}

function ZoomScaleHandler() {
  const map = useMap();
  useMapEvents({
    zoom: () => {
      const scale = getScale(map.getZoom());
      document.documentElement.style.setProperty('--marker-scale', String(scale));
    },
  });
  return null;
}

const MemoizedMarker = React.memo(({ landmark, icon }: Props) => (
  <Marker position={[landmark.lat, landmark.lng]} icon={icon}>
    <Tooltip direction="top" offset={[0, -30]}>{landmark.name}</Tooltip>
    <Popup>...</Popup>
  </Marker>
));

export function MapMarkers({ landmarks }: { landmarks: Landmark[] }) {
  const laborIcon = useMemo(() => L.divIcon({
    html: `<div class="labor-marker">
      <svg viewBox="0 0 24 36" width="24" height="36">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#c53030"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: '',
  }), []);

  return (
    <>
      <ZoomScaleHandler />
      {landmarks.map(l => (
        <MemoizedMarker key={l.id} landmark={l} icon={laborIcon} />
      ))}
    </>
  );
}
```

```css
/* index.css */
:root {
  --marker-scale: 1;
}

.labor-marker {
  transform: scale(var(--marker-scale, 1));
  transform-origin: bottom center;
  transition: transform 0.15s ease-out;
  will-change: transform;
}

.labor-marker svg {
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}
```

---

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS variable not updating fast enough | Low | `zoom` event is synchronous; fallback to `zoomend` |
| `will-change` memory overhead | Low | Only applied to marker class, not every element |
| Tooltip performance with many markers | Medium | Tooltips are lazy-rendered by Leaflet |
| Browser compat for CSS variables | Very Low | Supported in all modern browsers since 2017 |
