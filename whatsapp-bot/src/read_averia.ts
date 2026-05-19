import { getManualText } from './manual-retriever';

async function test() {
    const path = "C:/Users/dave_/Sentinel cover/manuals_calderas/VIESMANN/MANUAL_VIESMANN_VITODENS_200-W.pdf";
    const text = await getManualText(path);
    console.log('--- AVERIA SECTION ---');
    console.log(text.substring(17700, 22000));
}

test();
