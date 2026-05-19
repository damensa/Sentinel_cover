import { google } from 'googleapis';
import { authorize } from './auth';
import * as fs from 'fs';

async function listAllFolders() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log('--- Listing all folders ---');
    const res = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name, parents)',
        pageSize: 1000,
    });

    const folders = res.data.files || [];
    let output = folders.map(f => `${f.name} (ID: ${f.id}, Parents: ${f.parents || 'None'})`).join('\n');
    fs.writeFileSync('all_folders.txt', output);
    console.log(`Saved ${folders.length} folders to all_folders.txt`);
}

listAllFolders().catch(console.error);
