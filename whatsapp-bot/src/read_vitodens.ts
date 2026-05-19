import { getManualText } from './manual-retriever';

async function test() {
    const path = "C:/Users/dave_/Sentinel cover/manuals_calderas/VIESMANN/MANUAL_VIESMANN_VITODENS_200-W.pdf";
    const text = await getManualText(path);
    console.log('--- MANUAL TEXT (START) ---');
    console.log(text.substring(0, 5000));
    console.log('--- SEARCHING FOR "01" ---');
    const index = text.indexOf(' 01 ');
    if (index !== -1) {
        console.log('Found " 01 " at index:', index);
        console.log('Context:', text.substring(index - 200, index + 200));
    } else {
        console.log('" 01 " not found.');
    }
}

test();
