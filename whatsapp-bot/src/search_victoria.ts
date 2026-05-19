const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const BAXI_DIR = 'C:/Users/dave_/Sentinel cover/manuals_calderas/BAXI';

async function searchVictoria() {
    const files = fs.readdirSync(BAXI_DIR).filter((f: string) => f.endsWith('.pdf'));
    console.log(`Searching in ${files.length} files...`);

    for (const file of files) {
        const filePath = path.join(BAXI_DIR, file);
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            if (data.text.toUpperCase().includes('VICTORIA')) {
                console.log(`MATCH FOUND: ${file}`);
                // Print a snippet of text to be sure
                const index = data.text.toUpperCase().indexOf('VICTORIA');
                console.log(`Snippet: ${data.text.substring(index, index + 100)}`);
            }
        } catch (e) {
            // console.error(`Error reading ${file}`);
        }
    }
}

searchVictoria().catch(console.error);
