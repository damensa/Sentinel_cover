const { fillXfa } = require('./xfa_engine');
const fs = require('fs');

async function testFill() {
    // 1. Define sample data based on field_map.json
    const sampleData = {
        "CBO_TipusVia": "CAR",
        "TXT_NomVia": "Carrer de Prova",
        "TXT_Num": "42",
        "TXT_Categoria": "Bàsica",
        "TXT_Tensio": "230 V",
        "TXT_MaterialConductor": "Coure",
        "TXT_UbicacioComptadors": "Sala",
        "TXT_TipusConnexio": "Assistida",
        "TXT_Us": "5", // Habitatge
        "OPT_Si": "P1"  // Subministrament complementari = Sí
    };

    const sourcePdf = 'C:/Users/dave_/Sentinel cover/templates/ELEC1CertificatInstalElectricaBT.pdf';
    const targetPdf = 'C:/Users/dave_/Sentinel cover/ELEC1_FILLED_TEST.pdf';

    try {
        console.log("Starting XFA fill test...");
        await fillXfa(sourcePdf, targetPdf, sampleData);
        console.log("Success! Test PDF created.");
    } catch (error) {
        console.error("Error during test fill:", error);
    }
}

testFill();
