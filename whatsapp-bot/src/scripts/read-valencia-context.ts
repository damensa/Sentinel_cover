import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const filePath = 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana/PR440_es_amp.pdf';

async function extract() {
    console.log(`Extracting text from ${filePath}...`);
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    // pdf-lib doesn't have a built-in text extractor, but I can check if there are any form fields or metadata
    // For real text extraction, I'd need another lib, but I can try to read the document title/subject
    console.log(`Title: ${pdfDoc.getTitle()}`);
    console.log(`Author: ${pdfDoc.getAuthor()}`);
    console.log(`Subject: ${pdfDoc.getSubject()}`);

    // Alternative: use a separate tool if available or just list fields (none found earlier)
    // I'll try to use standard 'pdf-parse' if it were available, but I don't know the environment libs.
    // I'll assume I should just acknowledge its presence as a "context" file as the user suggested.
}

extract().catch(console.error);
