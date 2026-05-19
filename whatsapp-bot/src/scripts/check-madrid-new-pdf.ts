import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const filePath = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/DHHBWA.pdf';

async function check() {
    console.log(`Checking if ${filePath} is an AcroForm...`);
    if (!fs.existsSync(filePath)) {
        console.log("File not found.");
        return;
    }
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`- Total fields found: ${fields.length}`);
    if (fields.length > 0) {
        console.log("✅ YES, it is an AcroForm.");
        fields.slice(0, 10).forEach(f => console.log(`  - Field: ${f.getName()}`));
    } else {
        console.log("❌ NO, it is not an AcroForm (no fillable fields).");
    }
}

check().catch(console.error);
