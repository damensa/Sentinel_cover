import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createDiagnosticPdf(filePath: string) {
    try {
        const data = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(data);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        fields.forEach(field => {
            const name = field.getName();
            try {
                // Try to set text for text fields
                if (field.constructor.name === 'PDFTextField' || name.startsWith('text')) {
                    (field as any).setText(name.replace('text__', ''));
                }
            } catch (e) {
                // Ignore errors for non-text fields
            }
        });

        const pdfBytes = await pdfDoc.save();
        const outputPath = filePath.replace('_fillable.pdf', '_DIAGNOSTIC.pdf');
        fs.writeFileSync(outputPath, pdfBytes);
        console.log(`✅ Created diagnostic PDF: ${path.basename(outputPath)}`);
    } catch (err: any) {
        console.error(`Error processing ${filePath}: ${err.message}`);
    }
}

async function run() {
    const dir = 'C:/Users/dave_/Sentinel cover/Templates/Arago';
    // Let's start with E0001 (Main communication) and C0004 (Certificate) as they are most common
    const targets = ['E0001_v5_fillable.pdf', 'C0004_v3_fillable.pdf', 'C0001_v2_3_fillable.pdf'];

    for (const target of targets) {
        await createDiagnosticPdf(path.join(dir, target));
    }
}

run().catch(console.error);
