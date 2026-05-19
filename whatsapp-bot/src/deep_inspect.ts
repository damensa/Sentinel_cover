import { PDFDocument, PDFName, PDFDict, PDFStream } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function deepInspect(filename: string) {
    console.log(`Deep inspecting ${filename}...`);
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), filename));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (acroForm) {
        console.log('✅ AcroForm entry found in catalog.');
        const acroFormDict = pdfDoc.context.lookup(acroForm) as PDFDict;
        const xfa = acroFormDict.get(PDFName.of('XFA'));
        if (xfa) {
            console.log('✅ XFA entry found.');
        } else {
            console.log('ℹ️ No XFA entry in AcroForm.');
        }

        const fields = acroFormDict.get(PDFName.of('Fields'));
        if (fields) {
            console.log('✅ Fields entry found in AcroForm.');
        }
    } else {
        console.log('❌ No AcroForm entry in catalog.');
    }

    // Check all objects for anything suspicious like XFA or template
    for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFDict) {
            const type = obj.get(PDFName.of('Type'));
            if (type === PDFName.of('XFA')) {
                console.log(`Found XFA object at ref ${ref.toString()}`);
            }
        }
    }
}

deepInspect('EsquemaUnifilarELEC2.pdf').catch(console.error);
