import { google } from 'googleapis';
import { authorize } from './auth';
import * as fs from 'fs';

async function listFoldersAndFiles() {
    console.error('Iniciant script de verificació de Drive...');
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });
    let output = '';

    const log = (msg: string) => {
        console.error(msg);
        output += msg + '\n';
    };

    log('--- Buscant carpetes a Google Drive ---');

    const res = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and (name contains 'Fagor' or name contains 'Junkers' or name contains 'Wolf')",
        fields: 'files(id, name)',
    });

    const folders = res.data.files || [];
    if (folders.length === 0) {
        log('No s\'han trobat carpetes amb aquests noms.');
    } else {
        for (const folder of folders) {
            log(`\nCarpeta trobada: ${folder.name} (ID: ${folder.id})`);

            const filesRes = await drive.files.list({
                q: `'${folder.id}' in parents`,
                fields: 'files(id, name, mimeType)',
            });

            const files = filesRes.data.files || [];
            log(`Fitxers a ${folder.name}:`);
            if (files.length === 0) {
                log('  (Buit)');
            } else {
                files.forEach(file => {
                    log(`  - ${file.name} (${file.mimeType})`);
                });
            }
        }
    }
    fs.writeFileSync('drive_results.txt', output);
    console.error('Resultats guardats a drive_results.txt');
}

listFoldersAndFiles().catch(console.error);
