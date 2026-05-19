import { downloadFile } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function testExtraction() {
    const fileId = '1SVDk8xoOrQ_BTO1PnEwnm8myDlVlfy4z'; // GUIA TÈCNICA SENTINEL_ CALDERES WOLF.pdf
    const tmpPath = path.join(process.cwd(), 'temp_test_wolf.pdf');

    console.log('Downloading PDF...');
    await downloadFile(fileId, tmpPath);

    console.log('Extracting text...');
    const text = await getManualText(tmpPath);

    console.log('--- EXTRACTED TEXT START ---');
    console.log(text.substring(0, 5000)); // Show first 5000 chars
    console.log('--- EXTRACTED TEXT END ---');

    fs.unlinkSync(tmpPath);
}

testExtraction().catch(console.error);
