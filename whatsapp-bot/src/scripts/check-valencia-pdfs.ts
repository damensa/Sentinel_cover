import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

async function check() {
    console.log(`Checking ${files.length} PDFs in ${dir}...`);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        console.log(`- ${file}: ${fields.length} fields found.`);
    }
}

check().catch(console.error);
