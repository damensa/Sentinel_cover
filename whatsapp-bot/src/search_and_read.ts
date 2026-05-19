import { google } from 'googleapis';
import { authorize } from './auth';

async function searchAndRead() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const docs = google.docs({ version: 'v1', auth: auth as any });

    console.log('Searching for the file...');
    const res = await drive.files.list({
        q: "name contains 'Formularis instal·ladors' and trashed = false",
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    const files = res.data.files;
    if (!files || files.length === 0) {
        console.log('No files found.');
        return;
    }

    const targetFile = files[0];
    console.log(`Found: ${targetFile.name} (ID: ${targetFile.id}, Type: ${targetFile.mimeType})`);

    if (targetFile.mimeType === 'application/vnd.google-apps.document') {
        console.log('Reading content...');
        try {
            const docId = targetFile.id as string;
            const res = await docs.documents.get({ documentId: docId });
            const doc = res.data;
            const text = doc.body?.content?.map((c: any) =>
                c.paragraph?.elements?.map((e: any) => e.textRun?.content).join('')
            ).join('\n') || '';
            console.log('--- CONTENT START ---');
            console.log(text);
            console.log('--- CONTENT END ---');
        } catch (err: any) {
            console.error('Error reading doc:', err.message);
        }
    } else {
        // If it's a PDF or something else, we might need a different approach
        console.log(`Don't know how to read ${targetFile.mimeType} yet.`);
    }
}

searchAndRead().catch(console.error);
