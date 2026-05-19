import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana';
const outputDir = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana/Analysis';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

async function dump() {
    console.log(`Dumping fields for ${files.length} PDFs...`);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const fieldNames = fields.map(f => f.getName());

        const outputJson = path.join(outputDir, `${file}_fields.json`);
        fs.writeFileSync(outputJson, JSON.stringify(fieldNames, null, 2));
        console.log(`- ${file}: ${fields.length} fields dumped to ${outputJson}`);
    }
}

dump().catch(console.error);
