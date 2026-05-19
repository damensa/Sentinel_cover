
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFStream } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function fillPDF() {
    console.log('Loading PDF...');
    const pdfBytes = fs.readFileSync(path.join(process.cwd(), 'ELEC1CertificatInstalElectricaBT.pdf'));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const formStart = `
<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/">
<xfa:data>
<DATA>
    <principal>
        <sTitular>
            <NomCognoms>TEST USER NAME</NomCognoms>
            <NIF>12345678Z</NIF>
        </sTitular>
        <sEmpresaIns>
            <NomCognoms>INSTAL·LACIONS SABADELL S.L.</NomCognoms>
            <TXT_Rasic>005001234</TXT_Rasic>
            <NIF>B66123456</NIF>
            <NomCognomsInstalador>JOAN GARCIA</NomCognomsInstalador>
            <TXT_Categoria>BT-IE</TXT_Categoria>
            <DNIInstallador>44556677Z</DNIInstallador>
        </sEmpresaIns>
        <sInstallacio>
            <sAdreca>
                <TXT_NomVia>Carrer de la Prova, 123</TXT_NomVia>
                <TXT_Num>123</TXT_Num>
                <TXT_Pis>1</TXT_Pis>
                <TXT_Porta>1</TXT_Porta>
                <TXT_CodiPostal>08202</TXT_CodiPostal>
                <TXT_Poblacio>SABADELL</TXT_Poblacio>
            </sAdreca>
        </sInstallacio>
        <sCaracteristiques>
            <sRequisits>
                <sTotes>
                    <TXT_PotenciaMax>5.75</TXT_PotenciaMax>
                    <TXT_Tensio>230</TXT_Tensio>
                </sTotes>
            </sRequisits>
        </sCaracteristiques>
    </principal>
</DATA>
</xfa:data>
</xfa:datasets>
    `.trim();

    console.log('Creating new datasets stream...');
    // Create a new stream with the XML data
    const newStream = pdfDoc.context.flateStream(formStart);

    // Find XFA in AcroForm
    const catalog = pdfDoc.catalog;
    const acroForm = catalog.get(PDFName.of('AcroForm'));
    if (!acroForm) throw new Error('No AcroForm');

    const acroFormDict = pdfDoc.context.lookup(acroForm) as PDFDict;
    const xfa = acroFormDict.get(PDFName.of('XFA'));
    if (!xfa) throw new Error('No XFA');

    const xfaArray = pdfDoc.context.lookup(xfa);
    if (!(xfaArray instanceof PDFArray)) throw new Error('XFA is not an array');

    let found = false;
    for (let i = 0; i < xfaArray.size(); i++) {
        const item = xfaArray.get(i);
        const itemObj = pdfDoc.context.lookup(item);

        if (itemObj instanceof PDFString && itemObj.asString() === 'datasets') {
            console.log('Found datasets at index', i);
            // The next item should be the stream
            if (i + 1 < xfaArray.size()) {
                console.log('Replacing stream at index', i + 1);
                // We assume we can just set the new reference here?
                // xfaArray.set(i + 1, newStream); 
                // Wait, newStream needs to be registered? 
                // pdfDoc.context.register(newStream); // It returns a Ref

                const newStreamRef = pdfDoc.context.register(newStream);
                xfaArray.set(i + 1, newStreamRef);
                found = true;
            }
            break;
        }
    }

    if (!found) {
        console.log('Datasets not found, appending...');
        // If not found, we might need to append it? 
        // But usually it exists.
        // If it doesn't exist, we should check if we should add it.
        // For now, let's assume it exists.
    }

    console.log('Saving PDF...');
    const pdfBytesSaved = await pdfDoc.save();
    fs.writeFileSync('test_filled.pdf', pdfBytesSaved);
    console.log('Done! Saved to test_filled.pdf');
}

fillPDF().catch(console.error);
