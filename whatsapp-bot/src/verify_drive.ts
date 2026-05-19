import { google } from 'googleapis';
import { authorize } from './auth';

async function verifyDrive() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const foldersToCheck = ['Fagor', 'Normativa calderes'];

    for (const folderName of foldersToCheck) {
        console.log(`\n--- Checking ${folderName} ---`);
        const folderRes = await drive.files.list({
            q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)',
        });

        if (!folderRes.data.files || folderRes.data.files.length === 0) {
            console.log(`Folder ${folderName} not found`);
            continue;
        }

        const folderId = folderRes.data.files[0].id;
        const filesRes = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(name)',
            pageSize: 10
        });

        filesRes.data.files?.forEach(f => console.log(f.name));
    }
}

verifyDrive().catch(console.error);
