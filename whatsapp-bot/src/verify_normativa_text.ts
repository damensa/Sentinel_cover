import { downloadFile, listFolderFiles } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function verifyNormativaContent() {
    // 1. NORMATIVA_distribución_y_utilización_de_combustibles_gaseosos.pdf 
    // This is likely where UNE 60670 is.
    const gasFileId = '1tjFtQrJpPPZLccvUcWL8aQQx5uDCSOMB';
    const riteFileId = '1H0GTGYwxdVFtD-tSHBokUexg6xfNzsF5';

    await checkFile(gasFileId, 'GAS (UNE 60670?)');
    await checkFile(riteFileId, 'RITE');
}

async function checkFile(id: string, label: string) {
    console.log(`\n--- Checking ${label} (${id}) ---`);
    const safeLabel = label.replace(/[^a-z0-9]/gi, '_');
    const tmpPath = path.join(process.cwd(), `temp_${safeLabel}.pdf`);

    try {
        await downloadFile(id, tmpPath);
        const text = await getManualText(tmpPath);
        const lower = text.toLowerCase();

        const keywords = ['60670', '40 cm', '40cm', 'façana', 'fachada', 'pendiente', 'pendent'];

        for (const k of keywords) {
            const idx = lower.indexOf(k);
            if (idx !== -1) {
                console.log(`[FOUND] "${k}" at index ${idx}`);
                console.log(`CONTEXT: ...${text.substring(idx - 100, idx + 100).replace(/\n/g, ' ')}...`);
            } else {
                console.log(`[MISSING] "${k}"`);
            }
        }
    } catch (e) {
        console.error(`Error checking ${label}:`, e);
    } finally {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
}

verifyNormativaContent().catch(console.error);
