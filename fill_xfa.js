const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFRawStream } = require('pdf-lib');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

/**
 * Fills an XFA PDF by injecting data into its XML datasets.
 */
async function fillXfa(sourcePdfPath, targetPdfPath, data) {
    const pdfBytes = fs.readFileSync(sourcePdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // 1. Find XFA
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (!acroForm) throw new Error("AcroForm missing");
    const acroFormDict = pdfDoc.context.lookup(acroForm);
    const xfa = acroFormDict.get(PDFName.of('XFA'));
    if (!xfa) throw new Error("XFA missing");

    const xfaObj = pdfDoc.context.lookup(xfa);
    if (!(xfaObj instanceof PDFArray)) throw new Error("XFA is not an array");

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
    if (!datasetsRef) throw new Error("Datasets not found in XFA");

    const datasetsStream = pdfDoc.context.lookup(datasetsRef);
    if (!datasetsStream) throw new Error("Could not resolve datasets stream");

    // Use direct .contents property bypasses any getContents() method weirdness
    const contents = datasetsStream.contents || (datasetsStream.getContents ? datasetsStream.getContents() : null);
    if (!contents) throw new Error("Stream contents are empty");

    let datasetsXml = Buffer.from(contents).toString('utf8');

    // 2. Parse and Inject
    const parser = new XMLParser({ ignoreAttributes: false });
    const builder = new XMLBuilder({ ignoreAttributes: false });
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

    console.log("Filling...");
    for (const [k, v] of Object.entries(data)) inject(jsonObj, k, v);

    // 3. Update Stream
    const updatedXml = builder.build(jsonObj);
    const newStream = pdfDoc.context.flateStream(updatedXml);
    // Explicitly add getContents if it's missing (pdf-lib 1.x vs 2.x?)
    if (typeof newStream.getContents !== 'function') {
        newStream.getContents = () => newStream.contents;
    }
    const newStreamRef = pdfDoc.context.register(newStream);
    xfaObj.set(datasetsIdx, newStreamRef);

    const savedBytes = await pdfDoc.save();
    fs.writeFileSync(targetPdfPath, savedBytes);
    console.log(`Saved to ${targetPdfPath}`);
}

module.exports = { fillXfa };
