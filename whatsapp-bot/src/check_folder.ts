import { google } from 'googleapis';
import { authorize } from './auth';

async function checkFolderContent(folderId: string) {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log(`--- Checking content for folder: ${folderId} ---`);
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
    });
    const files = res.data.files || [];
    if (files.length === 0) {
        console.log('  Folder is empty.');
    } else {
        files.forEach(f => console.log(`  - ${f.name} (${f.mimeType})`));
    }
}

// Viessmann folder ID from brand_folders.txt
checkFolderContent('1TbHi0eLNVgYgIV_IR8zz5JuLFANTdGg6').catch(console.error);
