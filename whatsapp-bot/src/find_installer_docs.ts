import { google } from 'googleapis';
import { authorize } from './auth';

async function findInstallerDocs() {
    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth: auth as any });

        const folderName = 'Documents instaladors';
        const targetFileName = 'ELEC1CertificatInstalElectricaBT.pdf';
        console.log(`Searching for folder: "${folderName}"...`);

        const res = await drive.files.list({
            q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const folders = res.data.files || [];

        if (folders.length === 0) {
            console.log('No folder found with that exact name.');
            // Try partial match
            console.log('Trying partial match...');
            const resPartial = await drive.files.list({
                q: `name contains '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, webViewLink)',
            });
            const partialFolders = resPartial.data.files || [];
            if (partialFolders.length === 0) {
                console.log('No folders found with partial match either.');
            } else {
                console.log('Found similar folders:');
                partialFolders.forEach(f => console.log(`- ${f.name} (ID: ${f.id})`));
            }
        } else {
            console.log('Folder found:');
            folders.forEach(f => console.log(`- ${f.name} (ID: ${f.id}) - Link: ${f.webViewLink}`));

            // Search for the specific file inside the folder
            if (folders[0] && folders[0].id) {
                console.log(`\nSearching for "${targetFileName}" in "${folders[0].name}"...`);
                const contentRes = await drive.files.list({
                    q: `'${folders[0].id}' in parents and name contains '${targetFileName}' and trashed = false`,
                    fields: 'files(id, name, mimeType)',
                });
                const files = contentRes.data.files || [];
                if (files.length === 0) {
                    console.log(`  File "${targetFileName}" not found. Listing all files to verify:`);
                    const allFilesRes = await drive.files.list({
                        q: `'${folders[0].id}' in parents and trashed = false`,
                        fields: 'files(id, name, mimeType)',
                    });
                    allFilesRes.data.files?.forEach(f => console.log(`  - ${f.name} (${f.mimeType})`));

                } else {
                    files.forEach(f => console.log(`  FOUND: ${f.name} (ID: ${f.id}) - Type: ${f.mimeType}`));
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

findInstallerDocs();
