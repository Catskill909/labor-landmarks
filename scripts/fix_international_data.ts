import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting International Data Fix ---');

    // 1. Identify records that are definitely outside North America
    // Western Europe is roughly lng > -15
    // Most of USA is lng < -65
    const internationalCandidates = await prisma.landmark.findMany({
        where: {
            country: 'USA',
            lng: { gt: -30 }
        }
    });

    console.log(`Found ${internationalCandidates.length} potential international records labeled as USA.`);

    for (const l of internationalCandidates) {
        let detectedCountry = null;
        let detectedCity = l.city;

        // Simple inference from description or name if available
        if (l.description.includes('Denmark') || l.name.includes('Denmark')) detectedCountry = 'Denmark';
        else if (l.description.includes('Netherlands') || l.description.includes('Amsterdam')) detectedCountry = 'Netherlands';
        else if (l.description.includes('United Kingdom') || l.description.includes('UK') || l.description.includes('Britain')) detectedCountry = 'United Kingdom';
        else if (l.description.includes('Portugal') || l.description.includes('Lisbon')) detectedCountry = 'Portugal';
        else if (l.description.includes('Italy') || l.description.includes('Rome')) detectedCountry = 'Italy';
        else if (l.description.includes('France') || l.description.includes('Paris')) detectedCountry = 'France';
        else if (l.description.includes('Germany') || l.description.includes('Berlin')) detectedCountry = 'Germany';
        else if (l.description.includes('Austria') || l.description.includes('Vienna')) detectedCountry = 'Austria';
        else if (l.description.includes('Belgium') || l.description.includes('Brussels')) detectedCountry = 'Belgium';

        // Extract city if blank and visible in description or address
        if (!detectedCity || detectedCity === '') {
            if (l.description.includes('Copenhagen')) detectedCity = 'Copenhagen';
            else if (l.description.includes('Amsterdam')) detectedCity = 'Amsterdam';
            else if (l.description.includes('Manchester')) detectedCity = 'Manchester';
            else if (l.description.includes('Lisbon')) detectedCity = 'Lisbon';
            else if (l.description.includes('Vienna')) detectedCity = 'Vienna';
            else if (l.description.includes('Brussels')) detectedCity = 'Brussels';
        }

        if (detectedCountry || detectedCity !== l.city) {
            console.log(`Updating ${l.name}: -> ${detectedCity}, ${detectedCountry}`);
            await prisma.landmark.update({
                where: { id: l.id },
                data: {
                    country: detectedCountry || null,
                    city: detectedCity || '',
                    state: '' // Usually don't have states in Europe the same way
                }
            });
        } else {
            // Just unset USA if we're not sure
            console.log(`Unsetting USA for ${l.name} (Lng: ${l.lng})`);
            await prisma.landmark.update({
                where: { id: l.id },
                data: { country: null }
            });
        }
    }

    // 2. Fix the mis-geocoded US records (PA record in Italy, NY record in France)
    // Mather Mine Disaster Monument (ID 170) -> Italy
    // Kate Mullaney House (ID 183) -> France

    const matherMine = await prisma.landmark.findFirst({ where: { name: { contains: 'Mather Mine' } } });
    if (matherMine && matherMine.lng > 0) {
        console.log('Fixing geocoding for Mather Mine (moving from Italy to PA)');
        await prisma.landmark.update({
            where: { id: matherMine.id },
            data: {
                lat: 39.9242,
                lng: -80.0101,
                country: 'USA',
                state: 'PA',
                city: 'Mather'
            }
        });
    }

    const kateMullaney = await prisma.landmark.findFirst({ where: { name: { contains: 'Kate Mullaney' } } });
    if (kateMullaney && kateMullaney.lng > 0) {
        console.log('Fixing geocoding for Kate Mullaney House (moving from France to NY)');
        await prisma.landmark.update({
            where: { id: kateMullaney.id },
            data: {
                lat: 42.7359,
                lng: -73.6823,
                country: 'USA',
                state: 'NY',
                city: 'Troy'
            }
        });
    }

    console.log('--- Done ---');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
