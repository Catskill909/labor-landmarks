import express from 'express'; // trigger re-check
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Endpoints

// GET all landmarks (Public API - Published only)
app.get('/api/landmarks', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const landmarks = await prisma.landmark.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(landmarks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch landmarks' });
    }
});

// GET all landmarks (Admin API - All records)
app.get('/api/admin/landmarks', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const landmarks = await prisma.landmark.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(landmarks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin landmarks' });
    }
});

// GET single landmark
app.get('/api/landmarks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const landmark = await prisma.landmark.findUnique({
            where: { id: parseInt(id) }
        });
        if (landmark) {
            res.json(landmark);
        } else {
            res.status(404).json({ error: 'Landmark not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch landmark' });
    }
});

// POST new landmark (Admin or Public Suggestion)
app.post('/api/landmarks', async (req, res) => {
    const { name, city, state, country, category, description, address, lat, lng, isPublished, email, website, telephone, sourceUrl } = req.body;
    try {
        // Default isPublished to false if not provided (Public Suggestion)
        const publishedStatus = isPublished !== undefined ? isPublished : false;

        // Validation / Sanitization
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        const newLandmark = await prisma.landmark.create({
            data: {
                name,
                city,
                state,
                country: country || 'USA',
                category,
                description,
                address,
                lat: isNaN(parsedLat) ? 0 : parsedLat,
                lng: isNaN(parsedLng) ? 0 : parsedLng,
                isPublished: publishedStatus,
                email,
                website,
                telephone,
                sourceUrl
            } as any
        });
        res.status(201).json(newLandmark);
    } catch (error) {
        console.error('Error creating landmark:', error);
        res.status(500).json({ error: 'Failed to create landmark' });
    }
});

// PUT update landmark
app.put('/api/landmarks/:id', async (req, res) => {
    const { id } = req.params;
    const { name, city, state, country, category, description, address, lat, lng, isPublished, email, website, telephone, sourceUrl } = req.body;
    try {
        const updatedLandmark = await prisma.landmark.update({
            where: { id: parseInt(id) },
            data: {
                name,
                city,
                state,
                country,
                category,
                description,
                address,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                isPublished, // Allow toggling published status
                email,
                website,
                telephone,
                sourceUrl
            } as any
        });
        res.json(updatedLandmark);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update landmark' });
    }
});

// DELETE landmark
app.delete('/api/landmarks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.landmark.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete landmark' });
    }
});

// GET backup of all landmarks as JSON file
app.get('/api/admin/backup', async (_req, res) => {
    try {
        const landmarks = await prisma.landmark.findMany({
            orderBy: { id: 'asc' }
        });
        const date = new Date().toISOString().split('T')[0];
        const filename = `landmarks_backup_${date}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(JSON.stringify(landmarks, null, 2));
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// POST import landmarks (Smart Merge)
app.post('/api/admin/import', async (req, res) => {
    const landmarks = req.body; // Expecting JSON array
    if (!Array.isArray(landmarks)) {
        return res.status(400).json({ error: 'Invalid format. Expected JSON array.' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
        for (const item of landmarks) {
            // 1. Scraped Records (sourceUrl based upsert)
            if (item.sourceUrl) {
                const existing = await prisma.landmark.findUnique({
                    where: { sourceUrl: item.sourceUrl }
                });

                if (existing) {
                    // Update existing
                    await prisma.landmark.update({
                        where: { id: existing.id },
                        data: {
                            name: item.name,
                            city: item.city,
                            state: item.state,
                            country: item.country || 'USA',
                            category: item.category,
                            description: item.description,
                            address: item.address,
                            lat: Number(item.lat),
                            lng: Number(item.lng),
                            email: item.email,
                            website: item.website,
                            telephone: item.telephone,
                            isPublished: item.isPublished
                        }
                    });
                    updatedCount++;
                } else {
                    // Create new
                    await prisma.landmark.create({
                        data: {
                            name: item.name,
                            city: item.city,
                            state: item.state,
                            country: item.country || 'USA',
                            category: item.category,
                            description: item.description,
                            address: item.address,
                            lat: Number(item.lat),
                            lng: Number(item.lng),
                            email: item.email,
                            website: item.website,
                            telephone: item.telephone,
                            sourceUrl: item.sourceUrl,
                            isPublished: item.isPublished
                        } as any
                    });
                    addedCount++;
                }
            }
            // 2. Manual Records (No sourceUrl - duplicate check by name+location)
            else {
                // Fuzzy check for existing
                const existingManual = await prisma.landmark.findFirst({
                    where: {
                        name: item.name,
                        // Simple float comparison might be tricky, but exact match for now reduces risk
                        lat: Number(item.lat),
                        lng: Number(item.lng)
                    }
                });

                if (!existingManual) {
                    await prisma.landmark.create({
                        data: {
                            name: item.name,
                            city: item.city,
                            state: item.state,
                            country: item.country || 'USA',
                            category: item.category,
                            description: item.description,
                            address: item.address,
                            lat: Number(item.lat),
                            lng: Number(item.lng),
                            email: item.email,
                            website: item.website,
                            telephone: item.telephone,
                            isPublished: item.isPublished
                        } as any
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
        }

        res.json({
            message: 'Import completed',
            stats: { added: addedCount, updated: updatedCount, skipped: skippedCount }
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`SERVER_v2_STARTED_ON_PORT_${port}`);
    console.log(`Server running at http://localhost:${port}`);
});
