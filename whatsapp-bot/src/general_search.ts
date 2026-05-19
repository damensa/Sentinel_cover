import { google } from 'googleapis';
import { authorize } from './auth';

async function searchGeneral(query: string) {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log(`--- Searching for: ${query} ---`);
    const res = await drive.files.list({
        // Search folders only
        q: `name contains '${query}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });
    const folders = res.data.files || [];
    if (folders.length === 0) {
        console.log('  No folders found.');
    } else {
        folders.forEach(f => console.log(`  - ${f.name} (ID: ${f.id})`));
    }
}

async function run() {
    await searchGeneral('Notebook');
    await searchGeneral('Sentinel');
    await searchGeneral('Resums');
    await searchGeneral('Tecnics');
    await searchGeneral('Viessmann');
}

run().catch(console.error);
