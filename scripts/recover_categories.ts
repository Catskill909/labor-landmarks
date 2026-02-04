import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const KNOWN_CATEGORIES = [
    'Art', 'Bas-relief', 'Bust', 'Fresco', 'Gravesite', 'Historical marker',
    'Labor history organization', 'Memorial', 'Monument', 'Mural', 'Museum',
    'Museum/Archive', 'Plaque', 'Sculpture', 'Statue', 'Structure', 'Union Hall',
    'Walking Tour'
].map(c => c.toLowerCase());

async function main() {
    const landmarks = await prisma.landmark.findMany();
    console.log(`Re-auditing ${landmarks.length} landmarks with refined logic...`);

    let fixCount = 0;

    for (const l of landmarks) {
        const nameClean = l.name.replace(/[“”"']/g, '').trim().toLowerCase();
        const catClean = l.category.replace(/[“”"']/g, '').trim().toLowerCase();

        // Check if category is junk (matches name, is an address, or is basically empty)
        const isWhitespace = !l.category.trim() || l.category === '​';
        const looksLikeAddress = l.category.includes('United Kingdom') || l.category.includes('Street') || l.category.match(/\d/);

        if (nameClean === catClean || l.category === l.name || looksLikeAddress || isWhitespace) {

            const lines = l.description.split('\n').map(line => line.trim()).filter(Boolean);

            // Search lines from bottom to top for a category match
            let foundCategory = null;
            let categoryLineIndex = -1;

            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                const potentialCats = line.split(',').map(c => c.trim().toLowerCase());

                // If the line contains at least one known category, it's our winner
                const hasMatch = potentialCats.some(pc => KNOWN_CATEGORIES.includes(pc));

                if (hasMatch) {
                    foundCategory = line;
                    categoryLineIndex = i;
                    break;
                }
            }

            // Fallback: If no strict match, but we have a short comma-separated line that isn't an address
            if (!foundCategory && lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                if (lastLine.length < 40 && !lastLine.includes('United Kingdom') && !lastLine.match(/\d/)) {
                    foundCategory = lastLine;
                    categoryLineIndex = lines.length - 1;
                }
            }

            if (foundCategory) {
                console.log(`Fixing "${l.name}":`);
                console.log(`  New Category: ${foundCategory}`);

                await prisma.landmark.update({
                    where: { id: l.id },
                    data: {
                        category: foundCategory,
                        // If we found it in the description, maybe leave the description alone or trim if it's the very last part
                        description: lines.slice(0, categoryLineIndex).join('\n')
                    }
                });
                fixCount++;
            } else if (looksLikeAddress) {
                // If it was an address and we can't find a better category, reset it to something safe
                console.log(`Resetting junk category for "${l.name}"`);
                await prisma.landmark.update({
                    where: { id: l.id },
                    data: { category: 'Historical Site' }
                });
            }
        }
    }

    console.log(`Refined recovery completed for ${fixCount} landmarks.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
