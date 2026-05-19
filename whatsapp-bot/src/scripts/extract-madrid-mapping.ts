import { PDFDocument, PDFTextField } from 'pdf-lib';
import fs from 'fs';

async function extract() {
    const filePath = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/Analysis/DHHBWA_fillable_v3_DIAGNOSTIC revisado.pdf';
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const mapping: Record<string, string> = {};

    fields.forEach(f => {
        if (f instanceof PDFTextField) {
            try {
                const val = f.getText();
                const name = f.getName();
                // If user changed the diagnostic name to something else, that's our key
                if (val && val !== name) {
                    mapping[name] = val;
                }
            } catch (e) { }
        }
    });

    console.log(JSON.stringify(mapping, null, 2));
}

extract().catch(console.error);
