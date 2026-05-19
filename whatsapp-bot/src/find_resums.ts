import { getDriveClient } from './services/google';

async function listSubfolders() {
    const parentId = '1onbuGHXC9-kgX9NAGgRgg0ajdrhLvZt7';
    console.log(`Listing subfolders for 'Resum marques' (ID: ${parentId})`);

    const drive: any = await getDriveClient();
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    console.log('Subfolders found:');
    console.log(JSON.stringify(res.data.files, null, 2));
}

listSubfolders().catch(console.error);
