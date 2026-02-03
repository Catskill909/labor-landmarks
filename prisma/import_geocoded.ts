import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const sourcePath = '/Users/paulhenshaw/Desktop/pull-data/landmarks_geocoded.json';
    const rawData = fs.readFileSync(sourcePath, 'utf8');
    const scrapedData = JSON.parse(rawData);

    console.log(`Starting import of ${scrapedData.length} landmarks...`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of scrapedData) {
        try {
            await prisma.landmark.upsert({
                where: { sourceUrl: item.url },
                update: {
                    name: item.name,
                    city: item.city || '',
                    state: item.state || '',
                    country: item.country || undefined,
                    category: item.type || '',
                    description: item.description || '',
                    address: item.address || '',
                    lat: parseFloat(item.latitude) || 0,
                    lng: parseFloat(item.longitude) || 0,
                    email: item.contact_email || null,
                    website: item.website || null,
                    telephone: item.phone || null,
                    isPublished: true, // Auto-publish scraped data
                },
                create: {
                    name: item.name,
                    city: item.city || '',
                    state: item.state || '',
                    country: item.country || undefined,
                    category: item.type || '',
                    description: item.description || '',
                    address: item.address || '',
                    lat: parseFloat(item.latitude) || 0,
                    lng: parseFloat(item.longitude) || 0,
                    email: item.contact_email || null,
                    website: item.website || null,
                    telephone: item.phone || null,
                    sourceUrl: item.url,
                    isPublished: true,
                },
            });
            importedCount++;
        } catch (error) {
            console.error(`Failed to import landmark: ${item.name}`, error);
            skippedCount++;
        }
    }

    console.log(`Import complete!`);
    console.log(`Successfully imported/updated: ${importedCount}`);
    console.log(`Skipped/Errors: ${skippedCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
