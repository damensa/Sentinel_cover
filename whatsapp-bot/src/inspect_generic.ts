import { PDFDocument, PDFName, PDFDict, PDFStream, PDFString, PDFArray } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function inspectPdf(filename: string) {
    console.log(`Inspecting ${filename}...`);
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), filename));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Check for XFA
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (acroForm) {
        const acroFormDict = pdfDoc.context.lookup(acroForm) as PDFDict;
        const xfa = acroFormDict.get(PDFName.of('XFA'));
        if (xfa) {
            console.log('✅ PDF has XFA data.');
        } else {
            console.log('ℹ️ PDF has regular AcroForm (no XFA).');
        }
    } else {
        console.log('❌ No AcroForm found.');
    }

    // List all fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log(`Found ${fields.length} fields.`);

    fields.forEach(field => {
        const type = field.constructor.name;
        const name = field.getName();
        console.log(`- [${type}] ${name}`);
    });
}

const target = 'EsquemaUnifilarELEC2.pdf';
inspectPdf(target).catch(console.error);
