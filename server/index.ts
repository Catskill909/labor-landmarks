import express from 'express'; // trigger re-check
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Image uploads directory — Coolify persistent storage mounts here in production
const uploadsDir = path.join(__dirname, '../uploads/landmarks');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    }
});

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// GET all landmarks (Public API - Published only, excludes submitter info)
app.get('/api/landmarks', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const landmarks = await prisma.landmark.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
        });
        // Build base URL for image paths
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        // Strip submitter contact info and add full image URLs
        const publicLandmarks = landmarks.map((l) => {
            const { submitterName, submitterEmail, submitterComment, ...rest } = l as typeof l & { submitterName?: string; submitterEmail?: string; submitterComment?: string };
            return {
                ...rest,
                images: rest.images.map((img) => ({
                    ...img,
                    url: `${baseUrl}/uploads/landmarks/${img.filename}`,
                    thumbnailUrl: `${baseUrl}/uploads/landmarks/thumb_${img.filename}`
                }))
            };
        });
        res.json(publicLandmarks);
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
            orderBy: { createdAt: 'desc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
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
            where: { id: parseInt(id) },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
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
    const { name, city, state, country, category, description, address, lat, lng, isPublished, email, website, telephone, sourceUrl, submitterName, submitterEmail, submitterComment } = req.body;
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
                sourceUrl,
                submitterName,
                submitterEmail,
                submitterComment
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
            orderBy: { id: 'asc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
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

// POST upload images for a landmark
app.post('/api/landmarks/:id/images', upload.array('images', 10), async (req, res) => {
    const landmarkId = parseInt(req.params.id as string);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const landmark = await prisma.landmark.findUnique({ where: { id: landmarkId } });
        if (!landmark) {
            return res.status(404).json({ error: 'Landmark not found' });
        }

        // Get current max sortOrder for this landmark
        const maxSort = await prisma.landmarkImage.findFirst({
            where: { landmarkId },
            orderBy: { sortOrder: 'desc' }
        });
        let nextSort = (maxSort?.sortOrder ?? -1) + 1;

        const created = [];
        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filename = `${landmarkId}_${timestamp}_${safeName}`;
            const thumbFilename = `thumb_${filename}`;

            // Save original
            const originalPath = path.join(uploadsDir, filename);
            await sharp(file.buffer).toFile(originalPath);

            // Generate thumbnail (400px wide)
            const thumbPath = path.join(uploadsDir, thumbFilename);
            await sharp(file.buffer)
                .resize(400, null, { withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);

            const image = await prisma.landmarkImage.create({
                data: {
                    landmarkId,
                    filename,
                    sortOrder: nextSort++
                }
            });
            created.push(image);
        }

        res.status(201).json(created);
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// DELETE an image from a landmark
app.delete('/api/landmarks/:id/images/:imageId', adminAuth, async (req, res) => {
    const landmarkId = parseInt(req.params.id as string);
    const imageId = parseInt(req.params.imageId as string);
    try {
        const image = await prisma.landmarkImage.findFirst({
            where: { id: imageId, landmarkId }
        });
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Delete files from disk
        const originalPath = path.join(uploadsDir, image.filename);
        const thumbPath = path.join(uploadsDir, `thumb_${image.filename}`);
        try { fs.unlinkSync(originalPath); } catch { /* file may not exist */ }
        try { fs.unlinkSync(thumbPath); } catch { /* file may not exist */ }

        // Delete DB record
        await prisma.landmarkImage.delete({ where: { id: imageId } });
        res.status(204).send();
    } catch (error) {
        console.error('Image delete error:', error);
        res.status(500).json({ error: 'Failed to delete image' });
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
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
