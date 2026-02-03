import fs from 'fs';
import path from 'path';

const sourcePath = '/Users/paulhenshaw/Desktop/pull-data/landmarks_geocoded.json';

try {
    const rawData = fs.readFileSync(sourcePath, 'utf8');
    const landmarks = JSON.parse(rawData);

    let fixedCount = 0;

    const updatedLandmarks = landmarks.map((l: any) => {
        // Fix Michel Giacometti Museum
        if (l.name.includes('Michel Giacometti Museum')) {
            console.log('Found Michel Giacometti Museum. Fixing location data...');
            fixedCount++;
            return {
                ...l,
                city: 'Setúbal',
                state: '',
                country: 'Portugal',
                address: 'Largo Defensores da República 3 2910 470, 2910 Setúbal, Portugal'
            };
        }
        return l;
    });

    if (fixedCount > 0) {
        fs.writeFileSync(sourcePath, JSON.stringify(updatedLandmarks, null, 2));
        console.log(`✅ Successfully updated ${fixedCount} record(s) in ${sourcePath}`);
    } else {
        console.log('⚠️ Target record not found in JSON.');
    }

} catch (error) {
    console.error('Error fixing JSON:', error);
}
