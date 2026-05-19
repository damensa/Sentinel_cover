import { downloadFile, listFolderFiles } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function searchAllNormativa() {
    const folderId = '1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL';
    const files = await listFolderFiles(folderId);

    for (const file of files) {
        if (file.mimeType !== 'application/pdf') continue;

        console.log(`\nChecking ${file.name}...`);
        const tmpPath = path.join(process.cwd(), `temp_${file.id}.pdf`);
        await downloadFile(file.id, tmpPath);

        const text = await getManualText(tmpPath);
        const lower = text.toLowerCase();

        const terms = ['40 cm', '40cm', 'finestra', 'ventana', 'orificio', 'obertura', 'façana', 'fachada'];

        for (const term of terms) {
            if (lower.includes(term)) {
                console.log(`  [MATCH] "${term}" found.`);
                const idx = lower.indexOf(term);
                console.log(`    Context: ...${text.substring(idx - 100, idx + 100).replace(/\n/g, ' ')}...`);
            }
        }

        fs.unlinkSync(tmpPath);
    }
}

searchAllNormativa().catch(console.error);
