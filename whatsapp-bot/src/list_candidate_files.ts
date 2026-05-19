import { google } from 'googleapis';
import { authorize } from './auth';

async function listFiles() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log('Searching for the file...');
    const res = await drive.files.list({
        q: "name contains 'Formularis instal·ladors' and trashed = false",
        fields: 'files(id, name, mimeType)',
    });

    const files = res.data.files;
    if (!files || files.length === 0) {
        console.log('No files found.');
        return;
    }

    files.forEach(f => {
        console.log(`- ${f.name} (ID: ${f.id}, MimeType: ${f.mimeType})`);
    });
}

listFiles().catch(console.error);
