import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Location Audit & Fix ---');

    // 1. Fix the Portugal Landmark
    const portugalLandmark = await prisma.landmark.findFirst({
        where: { name: { contains: 'Michel Giacometti Museum' } }
    });

    if (portugalLandmark) {
        console.log(`Found Portugal landmark: ${portugalLandmark.name} (ID: ${portugalLandmark.id})`);
        console.log(`Current Location: ${portugalLandmark.city}, ${portugalLandmark.state}, ${portugalLandmark.country}`);

        const updated = await prisma.landmark.update({
            where: { id: portugalLandmark.id },
            data: {
                city: 'Setúbal',
                country: 'Portugal',
                address: 'Largo Defensores da República 3 2910 470, 2910 Setúbal, Portugal'
            }
        });

        console.log(`✅ Fixed Portugal landmark. New Location: ${updated.city}, ${updated.state}, ${updated.country}`);
    } else {
        console.log('⚠️ Could not find Michel Giacometti Museum landmark.');
    }

    // 2. Audit for missing City/State with Country=USA
    const problematicRecords = await prisma.landmark.count({
        where: {
            country: 'USA',
            OR: [
                { city: '' },
                { state: '' }
            ]
        }
    });

    console.log(`\n--- Audit Results ---`);
    console.log(`Landmarks with Country='USA' but missing City or State: ${problematicRecords}`);

    // List a few for examples
    const examples = await prisma.landmark.findMany({
        where: {
            country: 'USA',
            OR: [
                { city: '' },
                { state: '' }
            ]
        },
        take: 5,
        select: { name: true, city: true, state: true, country: true }
    });

    if (examples.length > 0) {
        console.log('Examples:');
        examples.forEach(l => console.log(`- ${l.name}: "${l.city}", "${l.state}", "${l.country}"`));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
