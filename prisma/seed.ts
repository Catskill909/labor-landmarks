import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    const importedPath = path.join(__dirname, '../src/data/landmarks_imported.json');
    const defaultPath = path.join(__dirname, '../src/data/landmarks.json');

    let landmarksPath = defaultPath;
    if (fs.existsSync(importedPath)) {
        landmarksPath = importedPath;
        console.log('Using imported landmarks for seeding...');
    } else {
        console.log('Using default landmarks for seeding...');
    }

    const data = JSON.parse(fs.readFileSync(landmarksPath, 'utf8'));

    // Check if database is empty
    const count = await prisma.landmark.count();
    const forceSeed = process.env.FORCE_SEED === 'true';

    if (count > 0 && !forceSeed) {
        console.log(`Database already contains ${count} landmarks. Skipping seed.`);
        console.log('Use FORCE_SEED=true to overwrite.');
        return;
    }

    if (forceSeed) {
        console.log('FORCE_SEED set. Overwriting existing data...');
    } else {
        console.log('Database empty. Seeding landmarks...');
    }

    for (const item of data) {
        await prisma.landmark.upsert({
            where: { id: item.id },
            update: {
                name: item.name,
                city: item.city,
                state: item.state,
                category: item.category,
                description: item.description,
                address: item.address,
                lat: item.lat,
                lng: item.lng,
                isPublished: true,
            },
            create: {
                id: item.id,
                name: item.name,
                city: item.city,
                state: item.state,
                category: item.category,
                description: item.description,
                address: item.address,
                lat: item.lat,
                lng: item.lng,
                isPublished: true,
            },
        });
    }

    console.log(`Seeding complete. Seeded ${data.length} landmarks.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
