import { PDFDocument, PDFName, PDFDict, PDFStream, PDFString, PDFArray } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

async function deepInspectXFA() {
    console.log('Reading file...');
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), 'ELEC1CertificatInstalElectricaBT.pdf'));

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
                    console.log(`[${i}] Name: ${item.asString()}`);
                } else if (item instanceof PDFStream) {
                    console.log(`[${i}] Stream detected.`);
                    try {
                        // Get RAW encoded bytes (Uint8Array)
                        const rawBytes = item.getContents();
                        // Note: getContents() usually returns the raw stream data (compressed if FlateDecode).

                        const dict = item.dict;
                        const filter = dict.get(PDFName.of('Filter'));
                        console.log(`    Filter: ${filter ? filter.toString() : 'None'}`);

                        let decodedBytes = rawBytes;
                        // If Filter is FlateDecode, we try to decompress
                        if (filter && filter.toString() === '/FlateDecode') {
                            try {
                                decodedBytes = zlib.unzipSync(Buffer.from(rawBytes));
                                console.log('    ✅ Decompressed successfully with zlib!');
                            } catch (e: any) {
                                console.log(`    ⚠️ zlib decompression failed: ${e.message}. Saving raw.`);
                            }
                        }

                        // Determine filename
                        const nameIndex = i - 1;
                        let name = `stream_${i}`;
                        if (nameIndex >= 0) {
                            const prevItem = pdfDoc.context.lookup(xfaValue.get(nameIndex));
                            if (prevItem instanceof PDFString) {
                                name = prevItem.asString().replace(/[:\/]/g, '_');
                            }
                        }

                        const filename = `xfa_raw_${name}.xml`;
                        fs.writeFileSync(filename, decodedBytes);
                        console.log(`    Saved to ${filename} (${decodedBytes.length} bytes)`);

                    } catch (e: any) {
                        console.log(`    Error reading stream: ${e.message}`);
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
