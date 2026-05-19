import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function dumpFields(filePath: string) {
    try {
        const data = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(data);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const fieldNames = fields.map(f => f.getName());
        const outputPath = filePath.replace('.pdf', '_fields.json');
        fs.writeFileSync(outputPath, JSON.stringify(fieldNames, null, 2));
        console.log(`✅ Saved ${fieldNames.length} fields to ${path.basename(outputPath)}`);
    } catch (err: any) {
        console.error(`Error processing ${filePath}: ${err.message}`);
    }
}

async function run() {
    const dir = 'C:/Users/dave_/Sentinel cover/Templates/Arago';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('_fillable.pdf'));

    for (const file of files) {
        await dumpFields(path.join(dir, file));
    }
}

run().catch(console.error);
