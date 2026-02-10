# App Updates Plan — Labor Landmarks Alpha Launch

Requested by client ahead of Alpha launch to Labor historians.

---

## Update 1: "Suggest a Landmark" Button Redesign

**Current:** Muted "Suggest Site" button in header (`Header.tsx:69-75`) — blends in with `bg-zinc-800` styling and small `Plus` icon.

**Target:** A prominent, eye-catching "Suggest a Landmark" CTA button.

### Changes

**File: `src/components/Header.tsx`**
- **Desktop button (line 69-75):** Change text from "Suggest Site" → "Suggest a Landmark". Restyle to use a red/accent background (`bg-red-600 hover:bg-red-700`) with white text so it pops against the dark header. Keep the `Plus` icon but make it white.
- **Mobile menu item (line 127-140):** Update text from "Suggest Site" → "Suggest a Landmark" to match.

### Effort: Small — text + class changes only, no logic changes.

---

## Update 2: Introductory "About" Text

**Current:** An "About Labor Landmarks" button exists in the hamburger menu (`Header.tsx:113-124`), which opens an `AboutModal`. Content TBD — client (Chris) will draft copy.

**Target:** Make the About info more discoverable:
1. Keep it in the hamburger menu (already there)
2. Add a clickable **info icon (ℹ)** in the bottom-left footer area that also opens the About modal

### Changes

**File: `src/App.tsx`**
- Add an `Info` icon button to the footer (line 132-142), positioned in the left section before the copyright. Clicking it opens the About modal.
- Lift `isAboutOpen` / `setIsAboutOpen` state up to `App.tsx` (or use a shared context/callback) so both the Header menu item and the footer icon can trigger the same modal.
- Render `<AboutModal>` in `App.tsx` instead of (or in addition to) `Header.tsx`.

**File: `src/components/AboutModal.tsx`**
- Update content with Chris's copy once provided. For now, add a placeholder that's easy to find and replace.

### Effort: Small-Medium — state lifting + minor layout change.

---

## Update 3: Copyright / Footer Update

**Current:** Footer (`App.tsx:132-142`) shows `© 2026 Labor Radio Network` as plain text.

**Target:** Change to `© 2026 The Labor Heritage Foundation` and make it a clickable link to [laborheritage.org](https://laborheritage.org).

### Changes

**File: `src/App.tsx`**
- Line 134: Replace `<span>© 2026 Labor Radio Network</span>` with:
  ```tsx
  <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer"
     className="hover:text-white transition-colors">
    © 2026 The Labor Heritage Foundation
  </a>
  ```

### Effort: Tiny — single line change.

---

## Update 4: Landmark Images — Gallery System

This is the big feature. No image infrastructure currently exists — needs schema changes, file upload API, storage configuration, and frontend UI across multiple components.

### 4A. Database Schema

**File: `prisma/schema.prisma`**

Add a new `LandmarkImage` model to support multiple images per landmark:

```prisma
model LandmarkImage {
  id         Int      @id @default(autoincrement())
  landmarkId Int
  landmark   Landmark @relation(fields: [landmarkId], references: [id], onDelete: Cascade)
  filename   String
  caption    String?
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
}
```

Update the `Landmark` model to add the relation:
```prisma
model Landmark {
  ...existing fields...
  images      LandmarkImage[]
}
```

Then run:
```bash
npx prisma migrate dev --name add-landmark-images
npx prisma generate
```

### 4B. File Storage — Coolify Persistent Storage

Images will be stored on the server filesystem in a directory backed by a **Coolify persistent storage volume**.

- **Upload directory:** `/app/uploads/landmarks/` inside the container
- **Coolify config:** Add a persistent storage mount: `/app/uploads` → a named volume
- **File naming:** `{landmarkId}_{timestamp}_{sanitizedOriginal}.{ext}` to avoid collisions
- **Accepted formats:** JPEG, PNG, WebP
- **Max file size:** 5MB per image (configurable)
- **Thumbnail generation:** Use `sharp` to create thumbnails (e.g. 400px wide) on upload for card views

**File: `Dockerfile`**
- Add `RUN mkdir -p /app/uploads/landmarks` so the directory exists
- The Coolify volume mount at `/app/uploads` will persist data across deploys

**Coolify Configuration:**
- Add persistent storage: Source path (volume) → Container path `/app/uploads`

### 4C. Backend API — Upload & Serve

**New dependency:** `npm install multer sharp @types/multer @types/sharp`

**File: `server/index.ts`**

New endpoints:

1. **`POST /api/landmarks/:id/images`** (multipart form upload)
   - Accepts one or more image files
   - Validates file type (JPEG/PNG/WebP) and size (≤5MB)
   - Generates thumbnail via `sharp`
   - Saves original + thumbnail to `/app/uploads/landmarks/`
   - Creates `LandmarkImage` record(s) in DB
   - Returns the created image metadata

2. **`DELETE /api/landmarks/:id/images/:imageId`** (admin auth required)
   - Deletes the file from disk and the DB record

3. **`GET /uploads/landmarks/*`** (static file serving)
   - Add `express.static` middleware for `/uploads` → `/app/uploads`
   - This serves images directly via URL

4. **Update existing `GET /api/landmarks` and `GET /api/landmarks/:id`**
   - Include related `images` in Prisma queries (`include: { images: { orderBy: { sortOrder: 'asc' } } }`)

5. **Update existing `POST /api/landmarks`** (suggestion form)
   - Accept image uploads alongside the landmark creation form data
   - Or: two-step — create landmark first, then upload images to it

6. **Update admin import/export**
   - Export: include image metadata (not binary data)
   - Import: handle image references gracefully

### 4D. Frontend — Landmark Interface Update

**File: `src/components/LandmarkCard.tsx`**

Update the `Landmark` TypeScript interface (exported from this file and used everywhere):

```typescript
export interface LandmarkImage {
    id: number;
    filename: string;
    caption?: string;
    sortOrder: number;
}

export interface Landmark {
    ...existing fields...
    images?: LandmarkImage[];
}
```

### 4E. Frontend — Thumbnail on Landmark Cards

**File: `src/components/LandmarkCard.tsx`**

- After the title (`h3`, line 48-50), add an image area:
  - If landmark has images → show the first image as a thumbnail (aspect ratio ~16:9, rounded corners, object-cover)
  - If no images → show nothing (don't waste space with a placeholder)
- Thumbnail URL: `/uploads/landmarks/{filename}` (the thumbnail version)

### 4F. Frontend — Gallery in Detail Modal

**File: `src/components/DetailModal.tsx`**

- In the left panel (landmark info area), below the title and categories, add a gallery section:
  - **Single image:** Show it full-width in the left panel
  - **Multiple images:** Show a primary image full-width + small thumbnail strip below it. Clicking a thumbnail swaps the primary image.
  - **Lightbox:** Clicking the primary image opens a **lightbox modal on top of the detail modal** — full-screen dark overlay with the full-resolution image, left/right arrows to navigate, and close button (X or click outside).
- Use Framer Motion for smooth transitions between images in the gallery.

### 4G. Frontend — Image Upload in Suggestion Form

**File: `src/components/SuggestionModal.tsx`**

- Add an image upload section after the existing form fields
- Simple "click to upload or drag & drop" area styled in the existing dark/glass theme
- Material Design inspired:
  - Dashed border area with upload cloud icon
  - "Drag photos here or click to browse" text
  - Shows thumbnail previews of selected files before submission
  - Allow removing individual photos before submit
- Max 5 images per suggestion
- On form submit: send as `multipart/form-data` instead of JSON

### 4H. Frontend — Image Upload in Admin Add/Edit Landmark Modal

**File: `src/components/LandmarkModal.tsx`**

- Add a beautiful drag-and-drop upload zone matching the modern Material Design style:
  - Dashed border container with subtle animation on drag-over (border color change, slight scale)
  - Cloud upload icon (from Lucide: `Upload` or `ImagePlus`)
  - "Drag & drop images here, or click to browse" text
  - Preview grid showing uploaded/selected images with:
    - Thumbnail preview
    - Delete (X) button overlay on hover
    - Drag handle for reordering (sets `sortOrder`)
    - Optional caption input below each thumbnail
- When editing an existing landmark: show already-uploaded images + ability to add more or remove existing ones
- Consistent styling with existing modal: dark theme, rounded corners, red accents

### 4I. Frontend — Lightbox Component (New)

**File: `src/components/ImageLightbox.tsx`** (new file)

- Full-screen overlay (z-index above DetailModal)
- Shows the selected image at full resolution, centered
- Navigation arrows (left/right) if multiple images
- Keyboard support: Escape to close, arrow keys to navigate
- Click outside image or X button to close
- Smooth Framer Motion enter/exit animations
- Dark backdrop with blur

### 4J. Frontend — Drag & Drop Upload Component (New)

**File: `src/components/ImageUploader.tsx`** (new file)

Reusable component used by both `SuggestionModal` and `LandmarkModal`:

- Props: `onFilesSelected`, `existingImages`, `onRemoveExisting`, `maxFiles`
- Drag-and-drop zone with visual feedback
- File input (hidden, triggered by click)
- Client-side validation: file type, file size
- Preview grid with remove buttons
- Styled to match the app's dark glassmorphism aesthetic

---

## Implementation Order

| Phase | Items | Dependencies |
|-------|-------|-------------|
| **Phase 1** (Quick wins) | Updates 1, 2, 3 | None — can ship immediately |
| **Phase 2** (Schema + API) | 4A, 4B, 4C | Needs Coolify persistent storage configured |
| **Phase 3** (Display) | 4D, 4E, 4F, 4I | Phase 2 complete |
| **Phase 4** (Upload UI) | 4G, 4H, 4J | Phase 2 complete |

Phase 1 can be done and deployed independently. Phases 3 and 4 can be done in parallel once Phase 2 is in place.

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `multer` | Multipart form parsing for file uploads |
| `sharp` | Image resizing / thumbnail generation |
| `@types/multer` | TypeScript types |
| `@types/sharp` | TypeScript types |

---

## Deployment: Two Environments

### Local Dev
- `npm run dev:fullstack` — everything runs locally
- SQLite DB at `prisma/dev.db`, uploads written to `./uploads/landmarks/`
- Always dev & test here first before pushing

### Production (Coolify)
- Auto-deploys from `main` branch via Docker
- Separate production DB (SQLite in `/app/data/` volume)
- **REQUIRED before first deploy with images:** Add Coolify persistent storage volume → container path `/app/uploads`
- Without persistent storage, uploaded images will be lost on every redeploy
- No new environment variables needed

---

## Notes

- All image URLs are relative (`/uploads/landmarks/filename.jpg`) — no CDN needed for Alpha
- `sharp` works well on Alpine Linux (the Docker base image)
- The `onDelete: Cascade` on `LandmarkImage` ensures images are cleaned from DB when a landmark is deleted; a cleanup job or hook should also delete the files from disk
- The suggestion form image upload is intentionally simpler than the admin upload (no reordering, no captions) to keep the public UX clean
