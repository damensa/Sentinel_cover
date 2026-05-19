import { downloadFile } from './services/google';
import { getManualText } from './manual-retriever';
import path from 'path';
import fs from 'fs';

async function testNormativaContent() {
    // ID for "NORMATIVA_Instalaciones_Térmicas_en_los_Edificios.pdf" (RITE likely)
    // or maybe "NORMATIVA_distribución_y_utilización_de_combustibles_gaseosos.pdf" (Gas/UNE likely)

    // Let's check the Gas one first as smoke outlets are often there
    const fileId = '1tjFtQrJpPPZLccvUcWL8aQQx5uDCSOMB';
    const tmpPath = path.join(process.cwd(), 'temp_test_norm.pdf');

    console.log('Downloading Normativa PDF...');
    await downloadFile(fileId, tmpPath);

    console.log('Extracting text...');
    const text = await getManualText(tmpPath);
    const lower = text.toLowerCase();

    console.log('--- SEARCH RESULTS ---');
    console.log('Has "40 cm"?', lower.includes('40 cm') || lower.includes('40cm'));
    console.log('Has "façana"?', lower.includes('façana') || lower.includes('fachada'));
    console.log('Has "pendent"?', lower.includes('pendent') || lower.includes('pendiente'));
    console.log('Has "UNE 60670"?', lower.includes('60670'));

    // Print snippets
    if (lower.includes('40 cm')) {
        const idx = lower.indexOf('40 cm');
        console.log('Snippet around 40 cm:', text.substring(idx - 100, idx + 100));
    }

    fs.unlinkSync(tmpPath);
}

testNormativaContent().catch(console.error);
