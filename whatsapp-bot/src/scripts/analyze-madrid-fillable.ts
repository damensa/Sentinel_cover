import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const filePath = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/DHHBWA_fillable.pdf';
const outputDir = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/Analysis';

async function analyze() {
    console.log(`Analyzing ${filePath}...`);
    if (!fs.existsSync(filePath)) {
        console.log("File not found.");
        return;
    }

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`- Total fields: ${fields.length}`);

    if (fields.length === 0) {
        console.log("❌ Still no fields found. Please check the PDF creation process.");
        return;
    }

    const fieldData = fields.map(f => ({
        name: f.getName(),
        type: f.constructor.name
    }));

    const outputPath = path.join(outputDir, 'DHHBWA_fillable_fields.json');
    fs.writeFileSync(outputPath, JSON.stringify(fieldData, null, 2));
    console.log(`✅ Fields extracted to ${outputPath}`);

    // Create diagnostic PDF
    for (const field of fields) {
        try {
            if ('setText' in field) (field as any).setText(field.getName());
        } catch (e) { }
    }

    const diagPath = path.join(outputDir, 'DHHBWA_fillable_DIAGNOSTIC.pdf');
    fs.writeFileSync(diagPath, await pdfDoc.save());
    console.log(`✅ Diagnostic PDF created at ${diagPath}`);
}

analyze().catch(console.error);
