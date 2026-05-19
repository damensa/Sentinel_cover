import { google } from 'googleapis';
import { authorize } from './auth';
import * as fs from 'fs';

async function listBaxi() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    log('--- Searching for BAXI folder ---');
    const folderRes = await drive.files.list({
        q: "name contains 'BAXI' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
    });

    const folders = folderRes.data.files || [];
    if (folders.length === 0) {
        log('No BAXI folder found.');
        return;
    }

    for (const folder of folders) {
        log(`\nFound folder: ${folder.name} (ID: ${folder.id})`);
        const filesRes = await drive.files.list({
            q: `'${folder.id}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
        });

        const files = filesRes.data.files || [];
        log(`Files in ${folder.name}:`);
        files.forEach(file => {
            log(`- ${file.name} (${file.mimeType}) [${file.id}]`);
        });
    }
    fs.writeFileSync('baxi_drive_results.txt', output);
    console.log('\nResults saved to baxi_drive_results.txt');
}

listBaxi().catch(console.error);
