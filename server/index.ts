import express from 'express'; // trigger re-check
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { isAdminRequest, safeEqual, createUploadKey, verifyUploadKey, toPublicLandmark, PUBLIC_MAX_IMAGES } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Enable WAL mode for better concurrent read/write performance
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {});

// Behind Coolify's proxy: trust one hop so rate limits see the real client IP,
// not the proxy's (otherwise every visitor shares one limit).
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            // Map tiles, bundled marker icons (data:), and upload previews (blob:)
            "img-src": ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://tile.openstreetmap.org"],
            // Address lookup in the suggestion and admin forms
            "connect-src": ["'self'", "https://nominatim.openstreetmap.org"],
        },
    },
    // OpenStreetMap's tile servers require a Referer; helmet's default
    // (no-referrer) gets tiles refused. Same setting as the database app.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // The public JSON feed's image URLs are used by other sites
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// CORS stays open: /api/landmarks is a public feed, and admin calls use a
// Bearer header (not cookies), so other origins cannot borrow a session.
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const limiter = (windowMs: number, max: number) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter(60 * 1000, 100));           // general API (not images)
const authLimiter = limiter(60 * 1000, 5);          // admin password attempts
const submitLimiter = limiter(60 * 1000, 10);       // public suggestions
const uploadLimiter = limiter(60 * 1000, 10);       // image uploads

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); }
}));

// Admin Authentication Middleware
// Verifies the admin password from Authorization header (Bearer token)
// Skips auth if no ADMIN_PASSWORD is configured (local dev convenience)
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If no password configured, allow access (local dev / initial setup)
    if (!adminPassword) {
        return next();
    }

    if (isAdminRequest(req.headers.authorization, adminPassword)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized - Invalid or missing admin credentials' });
    }
};

// API Endpoints
// Password Verification for Admin (Production only) - NOT protected (it's the login endpoint)
app.post('/api/admin/verify-password', authLimiter, (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If no password is set in env, we allow it for ease of initial setup/local dev 
    // (though in local we skip this anyway in the frontend)
    if (!adminPassword) {
        return res.json({ success: true, message: 'No admin password configured on server' });
    }

    if (typeof password === 'string' && safeEqual(password, adminPassword)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

// Health check — touches the Landmark table, so a broken database reports 503
app.get('/api/health', async (_req, res) => {
    try {
        await prisma.landmark.count();
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ status: 'error' });
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
            const rest = toPublicLandmark(l);
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
    const isAdmin = isAdminRequest(req.headers.authorization, process.env.ADMIN_PASSWORD);
    try {
        const landmark = await prisma.landmark.findUnique({
            where: { id: parseInt(id) },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
        });
        if (landmark && (isAdmin || landmark.isPublished)) {
            res.json(isAdmin ? landmark : toPublicLandmark(landmark));
        } else {
            res.status(404).json({ error: 'Landmark not found' });
        }
    } catch (error) {
        console.error('Fetch landmark error:', error);
        res.status(500).json({ error: 'Failed to fetch landmark' });
    }
});

// POST new landmark (Admin or Public Suggestion)
app.post('/api/landmarks', submitLimiter, async (req, res) => {
    const { name, city, state, country, category, description, address, lat, lng, isPublished, email, website, telephone, sourceUrl, submitterName, submitterEmail, submitterComment } = req.body;
    try {
        // Only an admin can create a published landmark; public suggestions
        // always go to the review queue, whatever the request body says.
        const isAdmin = isAdminRequest(req.headers.authorization, process.env.ADMIN_PASSWORD);
        const publishedStatus = isAdmin && isPublished !== undefined ? Boolean(isPublished) : false;

        // Validation / Sanitization
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        const cleanString = (val: string | undefined | null): string | null => val?.trim() || null;
        const cleanUrl = (val: string | undefined | null): string | null => {
            const trimmed = val?.trim();
            if (!trimmed) return null;
            return trimmed.replace(/\/+$/, '');
        };

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
                email: cleanString(email),
                website: cleanUrl(website),
                telephone: cleanString(telephone),
                sourceUrl: cleanString(sourceUrl),
                submitterName: cleanString(submitterName),
                submitterEmail: cleanString(submitterEmail),
                submitterComment: cleanString(submitterComment)
            } as any
        });
        if (isAdmin) {
            res.status(201).json(newLandmark);
        } else {
            // The key lets this submitter attach photos to this suggestion only (see security.ts)
            res.status(201).json({ ...toPublicLandmark(newLandmark), uploadKey: createUploadKey(newLandmark.id) });
        }
    } catch (error) {
        console.error('Error creating landmark:', error);
        res.status(500).json({ error: 'Failed to create landmark' });
    }
});

// PUT update landmark
app.put('/api/landmarks/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { name, city, state, country, category, description, address, lat, lng, isPublished, email, website, telephone, sourceUrl } = req.body;
    try {
        // Convert empty optional strings to null to avoid unique constraint violations
        const cleanString = (val: string | undefined | null): string | null => val?.trim() || null;
        // Strip trailing slashes from URLs
        const cleanUrl = (val: string | undefined | null): string | null => {
            const trimmed = val?.trim();
            if (!trimmed) return null;
            return trimmed.replace(/\/+$/, '');
        };

        const updatedLandmark = await prisma.landmark.update({
            where: { id: parseInt(id as string) },
            data: {
                name,
                city,
                state,
                country: country || 'USA',
                category,
                description,
                address,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                isPublished,
                email: cleanString(email),
                website: cleanUrl(website),
                telephone: cleanString(telephone),
                sourceUrl: cleanString(sourceUrl)
            } as any
        });
        res.json(updatedLandmark);
    } catch (error) {
        console.error('Update landmark error:', error);
        res.status(500).json({ error: 'Failed to update landmark' });
    }
});

// DELETE landmark
app.delete('/api/landmarks/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.landmark.delete({
            where: { id: parseInt(id as string) }
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

// Image uploads: an admin, or a public submitter holding the one-time key for
// their own new suggestion. Checked BEFORE multer so a refused request is never
// buffered into memory.
const imageUploadAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isAdminRequest(req.headers.authorization, process.env.ADMIN_PASSWORD)) {
        res.locals.publicUpload = false;
        return next();
    }
    const landmarkId = parseInt(req.params.id as string);
    const key = req.headers['x-upload-key'];
    if (typeof key !== 'string' || !verifyUploadKey(key, landmarkId)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const landmark = await prisma.landmark.findUnique({ where: { id: landmarkId } });
    if (!landmark || landmark.isPublished) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.locals.publicUpload = true;
    next();
};

// POST upload images for a landmark
app.post('/api/landmarks/:id/images', uploadLimiter, imageUploadAuth, upload.array('images', 10), async (req, res) => {
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

        if (res.locals.publicUpload) {
            const existing = await prisma.landmarkImage.count({ where: { landmarkId } });
            if (existing + files.length > PUBLIC_MAX_IMAGES) {
                return res.status(400).json({ error: `A suggestion can have at most ${PUBLIC_MAX_IMAGES} photos` });
            }
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
