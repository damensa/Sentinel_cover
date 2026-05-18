const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFRawStream } = require('pdf-lib');
const fs = require('fs');
const zlib = require('zlib');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

/**
 * Fills an XFA PDF by injecting data into its XML datasets.
 */
async function fillXfa(sourcePdfPath, targetPdfPath, data) {
    console.log("LOG: Reading file...");
    const pdfBytes = fs.readFileSync(sourcePdfPath);
    console.log("LOG: Loading PDF...");
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // 1. Find XFA
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    const acroFormDict = pdfDoc.context.lookup(acroForm);
    const xfa = acroFormDict.get(PDFName.of('XFA'));
    const xfaObj = pdfDoc.context.lookup(xfa);

    let datasetsRef = null;
    let datasetsIdx = -1;
    for (let i = 0; i < xfaObj.size(); i += 2) {
        const nameObj = pdfDoc.context.lookup(xfaObj.get(i));
        const name = (nameObj instanceof PDFName) ? nameObj.asName() : nameObj.toString();
        if (name.includes('datasets')) {
            datasetsRef = xfaObj.get(i + 1);
            datasetsIdx = i + 1;
            break;
        }
    }
    if (!datasetsRef) throw new Error("Datasets not found");

    const datasetsStream = pdfDoc.context.lookup(datasetsRef);
    console.log("LOG: Datasets stream found. Type:", datasetsStream.constructor.name);

    let contents = datasetsStream.contents;
    if (!contents) throw new Error("Stream contents are null");

    // Check for compression /Filter
    const filter = datasetsStream.dict.get(PDFName.of('Filter'));
    console.log("LOG: Stream Filter:", filter ? filter.toString() : "None");

    const isFlate = (f) => f === PDFName.of('FlateDecode') || f?.toString() === '/FlateDecode';

    let shouldDecompress = false;
    if (filter instanceof PDFArray) {
        for (let i = 0; i < filter.size(); i++) {
            if (isFlate(filter.get(i))) shouldDecompress = true;
        }
    } else if (isFlate(filter)) {
        shouldDecompress = true;
    }

    if (shouldDecompress) {
        console.log("LOG: Decompressing Flate stream...");
        try {
            contents = zlib.inflateSync(contents);
        } catch (e) {
            console.log("LOG: zlib.inflateSync failed, trying inflateRawSync...");
            contents = zlib.inflateRawSync(contents);
        }
    }

    console.log("LOG: Decoding XML...");
    const datasetsXml = Buffer.from(contents).toString('utf8');
    console.log("LOG: datasetsXml preview (first 100 chars):", datasetsXml.substring(0, 100));

    // 2. Parse and Inject
    console.log("LOG: Parsing XML...");
    const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: false });
    const builder = new XMLBuilder({ ignoreAttributes: false, preserveOrder: false });
    let jsonObj = parser.parse(datasetsXml);

    function inject(obj, name, val) {
        if (!obj || typeof obj !== 'object') return;
        for (const k in obj) {
            if (k.split(':').pop() === name) {
                if (typeof obj[k] === 'object' && obj[k] !== null) {
                    obj[k]['#text'] = val;
                } else {
                    obj[k] = val;
                }
                console.log(`  - Set ${k} to ${val}`);
            } else {
                inject(obj[k], name, val);
            }
        }
    }

    console.log("LOG: Injecting values...");
    for (const [k, v] of Object.entries(data)) inject(jsonObj, k, v);

    // 3. Update Stream
    const updatedXml = builder.build(jsonObj);
    const newStream = pdfDoc.context.flateStream(updatedXml);
    newStream.getContents = () => newStream.contents;

    const newStreamRef = pdfDoc.context.register(newStream);
    xfaObj.set(datasetsIdx, newStreamRef);

    console.log("LOG: Saving PDF...");
    const savedBytes = await pdfDoc.save();
    fs.writeFileSync(targetPdfPath, savedBytes);
    console.log(`LOG: Saved to ${targetPdfPath}`);
}

module.exports = { fillXfa };
