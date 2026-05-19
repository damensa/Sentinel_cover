import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelFile = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/DHHBWA.xls';
const dir = 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid';

async function inspect() {
    console.log(`--- EXCEL INSPECTION: ${excelFile} ---`);
    if (fs.existsSync(excelFile)) {
        const workbook = XLSX.readFile(excelFile);
        console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

        for (const name of workbook.SheetNames) {
            const sheet = workbook.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`\n[Sheet: ${name}] - Rows: ${data.length}`);
            // Show first 10 rows
            console.log(JSON.stringify(data.slice(0, 10), null, 2));
        }
    } else {
        console.log("Excel file not found.");
    }
}

inspect().catch(console.error);
