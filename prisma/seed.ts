import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    const landmarksPath = path.join(__dirname, '../src/data/landmarks.json');
    const data = JSON.parse(fs.readFileSync(landmarksPath, 'utf8'));

    console.log('Seeding landmarks...');

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
