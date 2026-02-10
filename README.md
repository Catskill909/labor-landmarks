# Labor Landmarks Map ✊

A professional, full-stack interactive map application designed to explore, visualize, and crowdsource significant sites in US and International Labor History. Built for The Labor Heritage Foundation.

## 🚀 Key Features

### 🗺️ Interactive Exploration
- **Dual View Modes**: Seamlessly switch between an interactive Map view (Leaflet) and a responsive List view.
- **Rich Landmark Modals**: Beautiful "Glassmorphism" detail cards showing:
    - Historical Significance (Description)
    - Full Metadata (Phone, Email, Website links)
    - Image Gallery with lightbox viewer
    - Interactive Mini-map (leaflet-based)
- **International Support**: Full support for landmarks outside the USA (Europe, Australia, etc.).
- **Smart Search**: Real-time filtering by Name, City, State, or Country.
- **Category Filtering**: Quickly drill down by types like "Strike/Event", "Monument", "Union Hall", "Museum", etc.

### 📸 Image Gallery System
- **Photo Uploads**: Admin and public users can upload images (JPEG, PNG, WebP, up to 5MB each).
- **Automatic Thumbnails**: Server-side thumbnail generation via `sharp` (400px wide JPEG).
- **Gallery Display**: Images appear on landmark cards (list view), map marker popups, and detail modals.
- **Lightbox Viewer**: Full-screen image viewer with keyboard navigation and Framer Motion animations.
- **Drag & Drop**: Reusable upload component with drag-and-drop, file previews, and client-side validation.

### 📢 Public Contributions
- **Suggestion System**: Public users can suggest new landmarks via a modern, multi-step "Suggest a Landmark" modal with optional image uploads.
- **Geocoding**: Integrated **OpenStreetMap Nominatim** for real-time address verification and coordinate generation.
- **Draft Workflow**: User submissions are held in a secure Review Queue until approved by an admin.

### 🛡️ Admin Dashboard (`/admin`)
- **Review Queue**: Dedicated tab for vetting, editing, and publishing new submissions.
- **CMS Control**: Full Edit/Delete/Add capabilities for all records in the inventory.
- **Smart Merge Import**: Robust JSON import system that merges local data with production data by matching `sourceUrl` or `Name + Location`.
- **Automated Backups**: 1-click JSON exports of the entire database.
- **Category Management**: Advanced multi-tag selection for categorizing sites.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion (Animations), React Leaflet (Map).
- **Backend**: Node.js, Express.js, Multer (file uploads), Sharp (image processing).
- **Database/ORM**: SQLite with Prisma ORM (Type-safe, portable, and extremely fast).
- **Styling**: Custom "Glassmorphism" Dark Mode theme with tailored red/white labor high-vibrancy accents.

## 📦 Deployment & Persistence

This project is fully containerized and ready for high-reliability deployment on platforms like **Coolify** or generic Docker hosts.

- **Database Storage**: Uses a Docker volume to persist the SQLite database (`/app/data/dev.db`) across restarts and code deployments.
- **Image Storage**: Uploaded images stored on disk (`/app/uploads/landmarks/`), served via Express static middleware. Requires Coolify persistent storage volume at `/app/uploads`.
- **Auto-Migration**: The container automatically applies database schema updates on startup.
- **Auto-Seeding Safety**: Built-in protection to prevent production data overwrite during deployments.

## � Local vs Production (IMPORTANT!)

| | Local Dev | Production |
|---|-----------|------------|
| **URL** | `localhost:5173` | `labor-landmarks.supersoul.top` |
| **Database** | Your machine | Docker volume on server |
| **Admin Auth** | Skipped | Password required |

### Syncing Data (The ONLY way)
```
LOCAL:  Admin → "Backup JSON" → downloads file
PROD:   Admin → "Import JSON" → upload that file
```

**⚠️ Git push updates CODE only, never DATA. See [HANDOFF.md](HANDOFF.md) for full details.**

## �💻 Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Full Stack (Recommended)**
   ```bash
   npm run dev:fullstack
   ```
   Access the frontend at `http://localhost:5173` and the API at `http://localhost:3001`.

## 📂 Project Structure

- `/src`: Frontend React source.
- `/server`: Express API implementation.
- `/prisma`: Database schema and migration history.
- `/uploads`: Local image storage (not committed to git).
- `/scripts`: Recovery and automation utilities:
    - `fix_international_data.ts`: Repairs geocoding and metadata for international sites.
    - `recover_categories.ts`: Audits and restores landmark categories from description text.

