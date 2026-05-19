
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFStream } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

async function inspectFilled() {

    const filePath = path.join(process.cwd(), 'test_filled.pdf');
    if (!fs.existsSync(filePath)) {
        console.log('test_filled.pdf not found');
        return;
    }

    console.log('Loading test_filled.pdf...');
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const catalog = pdfDoc.catalog;
    const acroForm = catalog.get(PDFName.of('AcroForm'));
    if (!acroForm) {
        console.log('❌ No AcroForm, so likely invalid');
        return;
    }

    const acroFormDict = pdfDoc.context.lookup(acroForm) as PDFDict;
    const xfa = acroFormDict.get(PDFName.of('XFA'));

    if (!xfa) {
        console.log('❌ NO XFA array, did we remove it?');
        return;
    }

    const xfaArray = pdfDoc.context.lookup(xfa);
    if (!(xfaArray instanceof PDFArray)) {
        console.log('❌ XFA is not an array');
        return;
    }

    console.log(`XFA Array Size: ${xfaArray.size()}`);
    let datasetsFound = false;

    for (let i = 0; i < xfaArray.size(); i++) {
        const item = xfaArray.get(i);
        const itemObj = pdfDoc.context.lookup(item);

        if (itemObj instanceof PDFString) {
            const name = itemObj.asString();
            console.log(`[${i}] Name: ${name}`);
            if (name === 'datasets') {
                datasetsFound = true;
            }
        } else if (itemObj instanceof PDFStream) {
            console.log(`[${i}] Stream.`);
            if (datasetsFound) {
                const contents = itemObj.getContents();
                console.log('--- DATASETS CONTENT PREVIEW ---');
                try {
                    // try standard unzip
                    const decoded = zlib.unzipSync(Buffer.from(contents));
                    console.log(decoded.toString().substring(0, 500));
                } catch (e) {
                    console.log('Decompression failed, maybe it is raw?');
                    console.log(Buffer.from(contents).toString('utf8').substring(0, 500));
                }
                console.log('--------------------------------');
                datasetsFound = false;
            }
        }
    }

}

inspectFilled().catch(err => console.error(err));
