import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelFile = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/DHHBWA.xls';

async function inspect() {
    console.log(`--- DEEP EXCEL INSPECTION ---`);
    const workbook = XLSX.readFile(excelFile);

    // Check CIE sheet (likely the main form)
    const cieSheet = workbook.Sheets['CIE'];
    if (cieSheet) {
        console.log("\n[CIE SHEET - FIRST 40 ROWS]");
        const data = XLSX.utils.sheet_to_json(cieSheet, { header: 1 });
        data.slice(0, 40).forEach((row: any, i) => {
            console.log(`${i + 1}: ${JSON.stringify(row)}`);
        });
    }

    // Check OPCIONES sheet
    const optionsSheet = workbook.Sheets['OPCIONES'];
    if (optionsSheet) {
        console.log("\n[OPCIONES SHEET - FIRST 20 ROWS]");
        const data = XLSX.utils.sheet_to_json(optionsSheet, { header: 1 });
        data.slice(0, 20).forEach((row: any, i) => {
            console.log(`${i + 1}: ${JSON.stringify(row)}`);
        });
    }
}

inspect().catch(console.error);
