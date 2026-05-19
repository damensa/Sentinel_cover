import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function inspectPDF() {
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), 'ELEC1CertificatInstalElectricaBT.pdf'));

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log(`--- PDF FIELD INSPECTION ---`);
        console.log(`Total Fields Detected: ${fields.length}`);

        if (fields.length > 0) {
            console.log('--- FIELD NAMES ---');
            fields.forEach(field => {
                const type = field.constructor.name;
                const name = field.getName();
                console.log(`- [${type}] ${name}`);
            });
        } else {
            console.log('⚠️ No standard AcroForm fields found.');
            console.log('Checking for XFA...');
            // Indirect check: if no fields but it's a form, it's likely XFA
            // pdf-lib doesn't expose raw XFA stream easily but we can check catalog
        }

    } catch (error) {
        console.error('Error inspecting PDF:', error);
    }
}

inspectPDF();
