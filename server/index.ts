import express from 'express';
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
app.use(express.json());

// API Endpoints

// GET all landmarks (Public API - Published only)
app.get('/api/landmarks', async (req, res) => {
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
app.get('/api/admin/landmarks', async (req, res) => {
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
    const { name, city, state, category, description, address, lat, lng, isPublished, email, website, telephone } = req.body;
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
                category,
                description,
                address,
                lat: isNaN(parsedLat) ? 0 : parsedLat,
                lng: isNaN(parsedLng) ? 0 : parsedLng,
                isPublished: publishedStatus,
                email,
                website,
                telephone
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
    const { name, city, state, category, description, address, lat, lng, isPublished, email, website, telephone } = req.body;
    try {
        const updatedLandmark = await prisma.landmark.update({
            where: { id: parseInt(id) },
            data: {
                name,
                city,
                state,
                category,
                description,
                address,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                isPublished, // Allow toggling published status
                email,
                website,
                telephone
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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`SERVER_v2_STARTED_ON_PORT_${port}`);
    console.log(`Server running at http://localhost:${port}`);
});
