import { google } from 'googleapis';
import { authorize } from './auth';

const BAXI_FOLDER_ID = '1ozeJj_blyivnKV-lYYwrKlfpJ0ZpWj89';

async function countBaxiDrive() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log(`\nCounting PDFs in BAXI folder (ID: ${BAXI_FOLDER_ID})...`);

    const res = await drive.files.list({
        q: `'${BAXI_FOLDER_ID}' in parents and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1000,
    });

    const files = res.data.files || [];
    console.log(`TOTAL PDF FILES: ${files.length}`);

    // Print first 5 for verification
    if (files.length > 0) {
        console.log('\nSample files:');
        files.slice(0, 5).forEach(f => console.log(`- ${f.name}`));
    }
}

countBaxiDrive().catch(console.error);
