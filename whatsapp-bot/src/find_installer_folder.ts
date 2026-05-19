import { google } from 'googleapis';
import { authorize } from './auth';

async function findFolder() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log('Searching for the folder "Documents instaladors"...');
    const res = await drive.files.list({
        q: "name = 'Documents instaladors' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
    });

    const folders = res.data.files || [];
    if (!folders || folders.length === 0) {
        console.log('Folder not found. Searching for any folder containing "instaladors"...');
        const secondaryRes = await drive.files.list({
            q: "name contains 'instaladors' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
        });
        if (!secondaryRes.data.files || secondaryRes.data.files.length === 0) {
            console.log('No folders found.');
            return;
        }
        folders.push(...secondaryRes.data.files);
    }

    for (const folder of folders) {
        console.log(`Found folder: ${folder.name} (ID: ${folder.id})`);
        console.log(`Listing PDF files in ${folder.name}...`);
        const fileRes = await drive.files.list({
            q: `'${folder.id}' in parents and mimeType = 'application/pdf' and trashed = false`,
            fields: 'files(id, name, mimeType)',
        });

        const files = fileRes.data.files;
        if (!files || files.length === 0) {
            console.log('  No PDF files found in this folder.');
        } else {
            files.forEach(f => {
                console.log(`  - ${f.name} (ID: ${f.id})`);
            });
        }
    }
}

findFolder().catch(console.error);
