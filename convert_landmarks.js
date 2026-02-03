import fs from 'fs';
import path from 'path';

const sourcePath = '/Users/paulhenshaw/Desktop/pull-data/landmarks_geocoded.json';
const targetPath = '/Users/paulhenshaw/Desktop/labor-map/src/data/landmarks_imported.json';

const rawData = fs.readFileSync(sourcePath, 'utf8');
const scrapedData = JSON.parse(rawData);

const convertedData = scrapedData.map((item, index) => {
    return {
        id: index + 100, // Offset to avoid potential conflicts with existing seed data if any
        name: item.name || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || '',
        category: item.type || '',
        description: item.description || '',
        address: item.address || '',
        lat: parseFloat(item.latitude) || 0,
        lng: parseFloat(item.longitude) || 0,
        email: item.contact_email || null,
        website: item.website || null,
        telephone: item.phone || null,
        isPublished: true
    };
});

fs.writeFileSync(targetPath, JSON.stringify(convertedData, null, 2));

console.log(`Converted ${convertedData.length} landmarks to ${targetPath}`);
