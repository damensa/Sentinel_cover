import { findManualFile, extractBrandAndModel } from './manual-retriever';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testRetriever() {
    const queries = [
        "manual de la caldera baxi luna ht",
        "instruccions baxi platinum iplus",
        "manual baxi neodens plus",
        "Roca Victoria 20/20"
    ];

    for (const query of queries) {
        console.log(`\nTesting query: "${query}"`);
        const match = await extractBrandAndModel(query, openai);
        console.log(`Extracted: Brand: ${match.brand}, Model: ${match.model}`);

        if (match.brand && match.model) {
            const filePath = findManualFile(match.brand, match.model);
            if (filePath) {
                console.log(`SUCCESS: Found manual at ${filePath}`);
            } else {
                console.log(`FAILURE: Manual not found for ${match.brand} ${match.model}`);
            }
        } else {
            console.log(`FAILURE: Could not extract brand/model`);
        }
    }
}

testRetriever().catch(console.error);
