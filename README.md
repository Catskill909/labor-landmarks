# Labor Landmarks Map ✊

A professional, full-stack interactive map application designed to explore, visualize, and crowdsource significant sites in US and International Labor History. Built for the Labor Radio Network.

## 🚀 Key Features

### 🗺️ Interactive Exploration
- **Dual View Modes**: Seamlessly switch between an interactive Map view (Leaflet) and a responsive List view.
- **Rich Landmark Modals**: Beautiful "Glassmorphism" detail cards showing:
    - Historical Significance (Description)
    - Full Metadata (Phone, Email, Website links)
    - Interactive Mini-map (leaflet-based)
- **International Support**: Full support for landmarks outside the USA (Europe, Australia, etc.).
- **Smart Search**: Real-time filtering by Name, City, State, or Country.
- **Category Filtering**: Quickly drill down by types like "Strike/Event", "Monument", "Union Hall", "Museum", etc.

### 📢 Public Contributions
- **Suggestion System**: Public users can suggest new landmarks via a modern, multi-step "Suggest a Site" modal.
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
- **Backend**: Node.js, Express.js.
- **Database/ORM**: SQLite with Prisma ORM (Type-safe, portable, and extremely fast).
- **Styling**: Custom "Glassmorphism" Dark Mode theme with tailored red/white labor high-vibrancy accents.

## 📦 Deployment & Persistence

This project is fully containerized and ready for high-reliability deployment on platforms like **Coolify** or generic Docker hosts.

- **Storage**: Uses a Docker volume (`labor_data`) to persist the SQLite database (`/app/data/dev.db`) across restarts and code deployments.
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
- `/scripts`: Recovery and automation utilities:
    - `fix_international_data.ts`: Repairs geocoding and metadata for international sites.
    - `recover_categories.ts`: Audits and restores landmark categories from description text.

