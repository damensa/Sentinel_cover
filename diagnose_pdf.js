const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');

async function diagnose() {
    const path = 'C:/Users/dave_/Sentinel cover/templates/ELEC1CertificatInstalElectricaBT.pdf';
    console.log(`Diagnosing: ${path}`);
    const pdfBytes = fs.readFileSync(path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const catalog = pdfDoc.catalog;
    console.log("Catalog keys:", catalog.keys().map(k => k.toString()));

    const acroForm = catalog.get(PDFName.of('AcroForm'));
    if (acroForm) {
        const acroFormDict = pdfDoc.context.lookup(acroForm);
        console.log("AcroForm keys:", acroFormDict.keys().map(k => k.toString()));
        const xfa = acroFormDict.get(PDFName.of('XFA'));
        console.log("XFA present:", !!xfa);
        if (xfa) {
            console.log("XFA type:", pdfDoc.context.lookup(xfa).constructor.name);
        }
    } else {
        console.log("No AcroForm found in Catalog");
    }
}

diagnose();
