import { PDFDocument, PDFName, PDFDict, PDFStream, PDFString, PDFArray } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

async function deepInspectXFA() {
    console.log('Reading DeclaracioResponsableInstallacio.pdf...');
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), 'DeclaracioResponsableInstallacio.pdf'));

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const catalog = pdfDoc.catalog;

        const acroForm = catalog.get(PDFName.of('AcroForm'));
        if (!acroForm) {
            console.log('❌ No AcroForm dictionary found.');
            return;
        }

        const acroFormDict = pdfDoc.context.lookup(acroForm) as PDFDict;
        const xfa = acroFormDict.get(PDFName.of('XFA'));

        if (!xfa) {
            console.log('❌ No XFA entry.');
            return;
        }

        const xfaValue = pdfDoc.context.lookup(xfa);

        if (xfaValue instanceof PDFArray) {
            console.log(`XFA Array Length: ${xfaValue.size()}`);

            for (let i = 0; i < xfaValue.size(); i++) {
                const itemRef = xfaValue.get(i);
                const item = pdfDoc.context.lookup(itemRef);

                if (item instanceof PDFString) {
                    // console.log(`[${i}] Name: ${item.asString()}`);
                } else if (item instanceof PDFStream) {
                    const dict = item.dict;
                    const filter = dict.get(PDFName.of('Filter'));

                    const rawBytes = item.getContents();
                    let decodedBytes = rawBytes;

                    if (filter && filter.toString() === '/FlateDecode') {
                        try {
                            decodedBytes = zlib.unzipSync(Buffer.from(rawBytes));
                        } catch (e) { }
                    }

                    const nameIndex = i - 1;
                    let name = `stream_${i}`;
                    if (nameIndex >= 0) {
                        const prevItem = pdfDoc.context.lookup(xfaValue.get(nameIndex));
                        if (prevItem instanceof PDFString) {
                            name = prevItem.asString().replace(/[:\/]/g, '_');
                        }
                    }

                    if (name === 'datasets') {
                        console.log('✅ Found datasets stream.');
                        fs.writeFileSync('dr_datasets.xml', decodedBytes);
                        console.log('Saved to dr_datasets.xml');
                    } else if (name === 'template') {
                        console.log('✅ Found template stream.');
                        fs.writeFileSync('dr_template.xml', decodedBytes);
                        console.log('Saved to dr_template.xml');
                    }
                }
            }

        } else {
            console.log('XFA is not an array.');
        }

    } catch (error) {
        console.error('Error in deep inspection:', error);
    }
}

deepInspectXFA();
