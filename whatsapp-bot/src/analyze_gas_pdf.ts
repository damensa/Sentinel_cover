import { downloadFile, listFolderFiles } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function analyzeGasPdf() {
    console.log('Finding Gas PDF...');
    const folderId = '1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL';
    const files = await listFolderFiles(folderId);

    // Look for the file: "NORMATIVA_distribución..."
    const gasFile = files.find((f: any) => f.name.includes('combustibles_gaseosos'));

    if (!gasFile) {
        console.error('Could not find Gas PDF!');
        return;
    }

    console.log(`Found Gas PDF: ${gasFile.name} (${gasFile.id})`);

    const tmpPath = path.join(process.cwd(), 'debug_gas.pdf');
    await downloadFile(gasFile.id, tmpPath);

    console.log('Extracting text...');
    const text = await getManualText(tmpPath);

    // Search for the texts the bot used ("50 cm", "sala de maquines")
    const botUsedTerms = ['50 cm', 'sala de', 'ventilación', 'orificio'];
    console.log('\n--- TERMS FOUND IN GAS PDF ---');
    for (const term of botUsedTerms) {
        const count = text.split(term).length - 1;
        console.log(`"${term}": ${count} occurrences`);
    }

    // Search for the "Correct" terms ("40 cm", "IT 1.3")
    const correctTerms = ['40 cm', 'IT 1.3', 'chimenea', 'xemeneia'];
    console.log('\n--- CORRECT TERMS IN GAS PDF ---');
    for (const term of correctTerms) {
        const count = text.split(term).length - 1;
        console.log(`"${term}": ${count} occurrences`);
    }

    fs.unlinkSync(tmpPath);
}

analyzeGasPdf().catch(console.error);
