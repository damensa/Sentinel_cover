import { google } from 'googleapis';
import { authorize } from './auth';

async function searchForUUID(uuid: string) {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log(`--- Searching for UUID: ${uuid} ---`);
    const res = await drive.files.list({
        q: `fullText contains '${uuid}' and trashed = false`,
        fields: 'files(id, name, mimeType, description)',
    });
    const files = res.data.files || [];
    if (files.length === 0) {
        console.log('  No results found.');
    } else {
        files.forEach(f => console.log(`  - ${f.name} (ID: ${f.id}, Type: ${f.mimeType}, Description: ${f.description || 'None'})`));
    }
}

async function run() {
    // Viessmann UUID
    await searchForUUID('9ded3ba2-de16-4f3b-872e-7a726fd2386b');
}

run().catch(console.error);
