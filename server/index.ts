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

// Admin Authentication Middleware
// Verifies the admin password from Authorization header (Bearer token)
// Skips auth if no ADMIN_PASSWORD is configured (local dev convenience)
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If no password configured, allow access (local dev / initial setup)
    if (!adminPassword) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${adminPassword}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized - Invalid or missing admin credentials' });
    }
};

// API Endpoints
// Password Verification for Admin (Production only) - NOT protected (it's the login endpoint)
app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If no password is set in env, we allow it for ease of initial setup/local dev 
    // (though in local we skip this anyway in the frontend)
    if (!adminPassword) {
        return res.json({ success: true, message: 'No admin password configured on server' });
    }

    if (password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

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
        console.error('Fetch landmarks error:', error);
        res.status(500).json({ error: 'Failed to fetch landmarks' });
    }
});

// GET all landmarks (Admin API - All records)
app.get('/api/admin/landmarks', adminAuth, async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const landmarks = await prisma.landmark.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(landmarks);
    } catch (error) {
        console.error('Fetch landmarks error:', error);
        res.status(500).json({ error: 'Failed to fetch admin landmarks' });
    }
});

// DELETE all landmarks (Emergency/Reset)
app.delete('/api/admin/clear', adminAuth, async (req, res) => {
    try {
        await prisma.landmark.deleteMany();
        res.json({ message: 'All landmarks deleted' });
    } catch (error) {
        console.error('Clear landmarks error:', error);
        res.status(500).json({ error: 'Failed to clear landmarks' });
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
        console.error('Fetch landmark error:', error);
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
app.get('/api/admin/backup', adminAuth, async (_req, res) => {
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

// POST import landmarks (Smart Merge with Transaction)
app.post('/api/admin/import', adminAuth, async (req, res) => {
    const landmarks = req.body; // Expecting JSON array
    if (!Array.isArray(landmarks)) {
        return res.status(400).json({ error: 'Invalid format. Expected JSON array.' });
    }

    try {
        // Wrap entire import in a transaction for atomicity
        const result = await prisma.$transaction(async (tx: typeof prisma) => {
            let addedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            for (const item of landmarks) {
                // 1. Scraped Records (sourceUrl based upsert)
                if (item.sourceUrl) {
                    const existing = await tx.landmark.findUnique({
                        where: { sourceUrl: item.sourceUrl }
                    });

                    if (existing) {
                        // Update existing
                        await tx.landmark.update({
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
                        await tx.landmark.create({
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
                    // Precision-safe coordinate matching (round to 4 decimal places ~11 meters)
                    const lat = Number(Number(item.lat).toFixed(4));
                    const lng = Number(Number(item.lng).toFixed(4));

                    const existingManual = await tx.landmark.findFirst({
                        where: {
                            name: item.name,
                            lat: {
                                gte: lat - 0.0001,
                                lte: lat + 0.0001
                            },
                            lng: {
                                gte: lng - 0.0001,
                                lte: lng + 0.0001
                            }
                        }
                    });

                    if (!existingManual) {
                        await tx.landmark.create({
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

            return { added: addedCount, updated: updatedCount, skipped: skippedCount };
        });

        res.json({
            message: 'Import completed',
            stats: result
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
