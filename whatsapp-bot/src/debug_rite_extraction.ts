import { downloadFile, listFolderFiles } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function debugRiteExtraction() {
    console.log('Finding RITE file...');
    const folderId = '1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL';
    const files = await listFolderFiles(folderId);

    // Look for the file: "Normativa_Instalaciones_térmicas_en_los_edificios.pdf"
    const riteFile = files.find((f: any) => f.name.includes('Instalaciones_Térmicas') || f.name.includes('Instalaciones_Termicas'));

    if (!riteFile) {
        console.error('Could not find RITE file!');
        return;
    }

    console.log(`Found RITE file: ${riteFile.name} (${riteFile.id})`);

    const tmpPath = path.join(process.cwd(), 'debug_rite.pdf');
    await downloadFile(riteFile.id, tmpPath);

    console.log('Extracting text...');
    const text = await getManualText(tmpPath);

    // Dump full text
    const dumpPath = path.join(process.cwd(), 'rite_full_dump.txt');
    fs.writeFileSync(dumpPath, text);
    console.log(`Full text dumped to ${dumpPath}`);

    // Search for specific values mentioned by user
    const values = ['2,20', '40 cm', '60 cm', 'IT 1.3.4', 'UNE 60670', 'evacuación', 'evacuació'];

    console.log('\n--- SEARCH RESULTS ---');
    for (const v of values) {
        const idx = text.indexOf(v);
        if (idx !== -1) {
            console.log(`[FOUND] "${v}" at index ${idx}`);
            console.log(`Context: ...${text.substring(idx - 150, idx + 150).replace(/\n/g, ' ')}...`);
        } else {
            console.log(`[MISSING] "${v}"`);
        }
    }

    fs.unlinkSync(tmpPath);
}

debugRiteExtraction().catch(console.error);
