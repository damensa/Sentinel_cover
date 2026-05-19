import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana';
const outputDir = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana/Diagnostics';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

async function generate() {
    console.log(`Generating diagnostic PDFs for ${files.length} files...`);
    for (const file of files) {
        if (file === 'PR440_es_amp.pdf') continue; // Not a form

        const filePath = path.join(dir, file);
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        for (const field of fields) {
            const name = field.getName();
            try {
                if ('setText' in field) {
                    (field as any).setText(name);
                }
            } catch (e) {
                // console.warn(`Could not set text for ${name}`);
            }
        }

        const outPath = path.join(outputDir, `${file}_DIAGNOSTIC.pdf`);
        fs.writeFileSync(outPath, await pdfDoc.save());
        console.log(`- Created: ${outPath}`);
    }
}

generate().catch(console.error);
