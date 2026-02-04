import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    console.log('Exporting landmarks from database to JSON...');

    const landmarks = await prisma.landmark.findMany({
        orderBy: { id: 'asc' }
    });

    const outputPath = path.join(__dirname, '../src/data/landmarks_imported.json');

    fs.writeFileSync(outputPath, JSON.stringify(landmarks, null, 2));

    console.log(`Successfully exported ${landmarks.length} landmarks to ${outputPath}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
