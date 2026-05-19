import { google } from 'googleapis';
import { authorize } from './auth';
import * as fs from 'fs';

async function listAllGDocs() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log('--- Searching for all Google Docs ---');
    const res = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.document' and trashed = false",
        fields: 'files(id, name, parents)',
        pageSize: 1000,
    });

    const files = res.data.files || [];
    let output = files.map(f => `${f.name} (ID: ${f.id}, Parents: ${f.parents || 'None'})`).join('\n');
    fs.writeFileSync('all_gdocs.txt', output);
    console.log(`Saved ${files.length} Google Docs to all_gdocs.txt`);
}

listAllGDocs().catch(console.error);
