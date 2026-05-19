import { getManualText } from './manual-retriever';

async function test() {
    const path = "C:/Users/dave_/Sentinel cover/manuals_calderas/VIESMANN/MANUAL_VIESMANN_VITODENS_200-W.pdf";
    const text = await getManualText(path);
    console.log('--- SEARCHING FOR KEYWORDS ---');
    const keywords = ['Avería', 'Código', 'Aviso', 'F.', 'E.'];
    for (const kw of keywords) {
        const index = text.indexOf(kw);
        if (index !== -1) {
            console.log(`Found "${kw}" at index:`, index);
            console.log('Context:', text.substring(index - 50, index + 200));
        } else {
            console.log(`"${kw}" not found.`);
        }
    }
}

test();
