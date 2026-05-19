import { detectBrand } from './router';
import { extractBrandAndModel, findManualFile, validateErrorCode, validateBrandModelWithCatalog } from './manual-retriever';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function runTests() {
    console.log('--- STARTING TESTS ---');

    // 1. Phonetic Detection Test
    console.log('\n[1] Testing Phonetic Detection:');
    const cases = [
        { input: 'Tinc una Bisman amb error', expected: 'viessmann' },
        { input: 'La meva Roca no encén', expected: 'baxi' },
        { input: 'Error en caldera vailan', expected: 'vaillant' }
    ];

    for (const c of cases) {
        const detected = detectBrand(c.input);
        console.log(`Input: "${c.input}" -> Detected: ${detected} (Expected: ${c.expected})`);
    }

    // 2. Consistency Test
    console.log('\n[2] Testing Consistency Check:');
    const consistencyCases = [
        { brand: 'Viessmann', model: 'Victoria' },
        { brand: 'BAXI', model: 'Victoria' },
        { brand: 'Vaillant', model: 'Ecotec' },
        { brand: 'Saunier Duval', model: 'Victoria' } // Reported failure
    ];

    for (const c of consistencyCases) {
        const { filePath, actualBrandDir } = findManualFile(c.brand, c.model);
        console.log(`Query: ${c.brand} ${c.model} -> Found in: ${actualBrandDir} (Path: ${filePath ? 'YES' : 'NO'})`);
        if (c.brand.toLowerCase() !== actualBrandDir?.toLowerCase()) {
            console.log(`  ALERT: Mismatch detected! (Input: ${c.brand}, Actual: ${actualBrandDir})`);
        } else {
            console.log(`  OK: Correct brand matching.`);
        }
    }

    // 3. Catalog Validation Test
    console.log('\n[3] Testing Catalog Validation (with Accents and Phonetics):');
    const catalogCases = [
        { brand: 'Saunier Duval', model: 'Victòria', expected: false },
        { brand: 'BAXI', model: 'Victòria', expected: true },
        { brand: 'Viessmann', model: 'Vitodens', expected: true },
        { brand: 'Saunier Duval', model: 'Themafast', expected: true },
        { brand: 'biaixament', model: 'bitodens', expected: true }
    ];

    for (const c of catalogCases) {
        const isValid = validateBrandModelWithCatalog(c.brand, c.model);
        console.log(`Query: ${c.brand} ${c.model} -> Valid in Catalog: ${isValid} (Expected: ${c.expected})`);
    }

    // 4. Error Code Extraction and Validation
    console.log('\n[4] Testing Error Code Validation (requires OpenAI):');
    const query = 'Tinc una BAXI Neodens Plus amb error E01';
    const extracted = await extractBrandAndModel(query, openai);
    console.log(`Extracted: Brand=${extracted.brand}, Model=${extracted.model}, Error=${extracted.errorCode}`);

    if (extracted.model) {
        const { filePath } = findManualFile(extracted.brand, extracted.model);
        if (filePath) {
            console.log(`Manual found for error validation.`);
            // Mocking manual text for speed, or we could load it
            const mockText = "Hi ha un error de falta de gas que es marca com a E01.";
            const isValid = validateErrorCode(mockText, extracted.errorCode);
            console.log(`Validation of error ${extracted.errorCode}: ${isValid ? 'VALID' : 'INVALID'}`);
        }
    }

    console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
