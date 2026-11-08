/**
 * Test data for the browser tests: a small, known set of landmarks written
 * into the throwaway test database (never the real one — serve.sh refuses to
 * run otherwise). The ids are saved to .tmp/fixtures.json for the specs.
 *
 * Spread across the country so "the map flies to the landmark" is visible:
 * Seattle is far from the centre of the all-landmarks view. Also: one landmark
 * with a photo record and one without (preview picture vs logo), a name that
 * is an HTML/script injection attempt, and an unpublished landmark.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = process.env.DATABASE_URL ?? '';
if (!db.endsWith('/tests/browser/.tmp/test.db')) {
    throw new Error(`Refusing to write test data: DATABASE_URL is not the test database (${db})`);
}

const prisma = new PrismaClient();

export const HOSTILE_NAME = 'Evil "><script>window.__pwned=1</script> Hall';

const base = { category: 'Monument', country: 'USA', isPublished: true };

async function create(name: string, city: string, state: string, lat: number, lng: number, extra: Record<string, unknown> = {}) {
    return prisma.landmark.create({
        data: {
            ...base, name, city, state, lat, lng,
            address: `1 Test Street, ${city}`,
            description: `Test fixture: ${name} in ${city}.`,
            ...extra,
        },
    });
}

async function main() {
    const seattle = await create('Seattle General Strike Site', 'Seattle', 'WA', 47.6062, -122.3321, {
        images: { create: [{ filename: 'fixture-seattle.jpg', sortOrder: 0 }] },
    });
    const triangle = await create('Triangle Shirtwaist Factory', 'New York', 'NY', 40.7302, -73.9955, {
        images: { create: [{ filename: 'fixture-triangle.jpg', sortOrder: 0 }] },
    });
    const haymarket = await create('Haymarket Martyrs Monument', 'Chicago', 'IL', 41.8728, -87.8156); // no photo
    await create('Cigar Workers Hall', 'Tampa', 'FL', 27.9506, -82.4572);
    await create('Bread and Roses Mill', 'Lawrence', 'MA', 42.7070, -71.1631);
    await create('Ludlow Massacre Memorial', 'Trinidad', 'CO', 37.3392, -104.6162);
    await create('Delano Grape Strike Hall', 'Delano', 'CA', 35.7688, -119.2471);
    const hostile = await create(HOSTILE_NAME, 'Kansas City', 'MO', 39.0997, -94.5786, {
        description: '"><img src=x onerror="window.__pwned=2"> test fixture',
    });
    const unpublished = await create('Unpublished Test Landmark', 'Boston', 'MA', 42.3601, -71.0589, { isPublished: false });

    const ids = { seattle: seattle.id, triangle: triangle.id, haymarket: haymarket.id, hostile: hostile.id, unpublished: unpublished.id };
    fs.writeFileSync(path.join(here, '.tmp', 'fixtures.json'), JSON.stringify(ids, null, 2));
    console.log('Test fixtures written:', ids);
}

main().finally(() => prisma.$disconnect());
