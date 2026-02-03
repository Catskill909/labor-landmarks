# Labor Landmarks Map ✊

A full-stack interactive map application to explore, visualize, and crowdsource significant sites in US Labor History. Built for the Labor Radio Network.

## Features

### 🗺️ Interactive Exploration
- **Dual Views**: Seamlessly switch between an interactive Map view (Leaflet) and a responsive List view.
- **Rich Details**: Beautiful modal cards for each landmark with historical descriptions, addresses, and categorization.
- **Smart Search**: Real-time filtering by Name, City, or State.
- **Category Filtering**: Quickly drill down by types like "Strike/Event", "Monument", "Union Hall", etc.

### 📢 Public Contributions
- **Suggestion System**: Public users can suggest new landmarks via a modern "Suggest a Site" modal.
- **Geocoding**: Integrated **OpenStreetMap Nominatim** for auto-completing addresses and coordinates.
- **Success Feedback**: Polished submission flow with visual confirmation.

### 🛡️ Admin Dashboard
- **Secure Management**: Dedicated `/admin` route for curators.
- **Review Queue**: Separate tab for vetting user-submitted "Draft" landmarks before they go live.
- **CMS**: Full CRUD (Create, Read, Update, Delete) capabilities.
- **Live Stats**: Real-time counters for Published vs. Pending items.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, React Leaflet.
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: SQLite (Production-ready with Docker volumes).
- **Styling**: Custom "Glassmorphism" Dark Mode theme.

## Deployment (Coolify / Docker)

This project is fully containerized and ready for 1-click deployment on Coolify.

### Docker Configuration
- **Multi-stage Build**: valid for lightweight production images.
- **Persistence**: Uses a Docker volume (`labor_data`) to persist the SQLite database (`/app/data/labor.db`) across restarts.
- **Auto-Migration**: The container automatically runs `prisma migrate deploy` and `seed.ts` on startup.

### How to Run Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server (Frontend + Backend)**
   ```bash
   npm run dev:fullstack
   ```
   Access the app at `http://localhost:5173`.

3. **Run Admin Server Only**
   ```bash
   npm run server
   ```
   API runs on port `3001`.

## Project Structure

- `/src`: Frontend React application.
- `/server`: Express API server.
- `/prisma`: Database schema and seed scripts.
- `/docker-compose.yml`: Production orchestration config.
