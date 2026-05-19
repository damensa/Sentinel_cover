import { google } from 'googleapis';
import { authorize } from './auth';
import * as fs from 'fs';

async function findBrandFolders() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    const brands = ['Viessmann', 'Baxi', 'Vaillant', 'Saunier', 'Fagor', 'Junkers', 'Ariston', 'Wolf', 'Chaffoteaux', 'Immergas', 'Ferroli', 'Cointra', 'Roca'];

    let output = '--- Searching for brand folders ---\n';
    for (const brand of brands) {
        const res = await drive.files.list({
            q: `name contains '${brand}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });
        const folders = res.data.files || [];
        output += `\nResults for "${brand}":\n`;
        if (folders.length === 0) {
            output += '  No folders found.\n';
        } else {
            folders.forEach(f => output += `  - ${f.name} (ID: ${f.id})\n`);
        }
    }
    fs.writeFileSync('brand_folders.txt', output);
    console.log('Results saved to brand_folders.txt');
}

findBrandFolders().catch(console.error);
