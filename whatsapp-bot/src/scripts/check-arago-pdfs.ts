import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function checkPdf(filePath: string) {
    try {
        const data = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(data);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log(`\n--- Checking: ${path.basename(filePath)} ---`);
        if (fields.length === 0) {
            console.log('❌ No AcroForm fields found.');
        } else {
            console.log(`✅ Found ${fields.length} form fields.`);
        }
    } catch (err: any) {
        console.error(`Error loading ${filePath}: ${err.message}`);
    }
}

async function run() {
    const dir = 'C:/Users/dave_/Sentinel cover/Templates/Arago';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('_fillable.pdf'));

    for (const file of files) {
        await checkPdf(path.join(dir, file));
    }
}

run().catch(console.error);
