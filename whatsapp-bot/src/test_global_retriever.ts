import { globalNormativeSearch } from './global-retriever';

async function testGlobal() {
    console.log("--- TESTING GLOBAL RETRIEVER (DEBUG MODE) ---");

    // Exact user query that failed
    const query = "Quina és la distància de la sortida de fums a una finestra?";
    const folderId = "1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL"; // Normativa folder ID

    console.log(`Query: ${query}`);

    // Return top 10 to see where the correct chunk lands
    const result = await globalNormativeSearch(query, folderId, 10);

    console.log("\n--- FULL RETRIEVED CONTEXT ---");
    console.log(result);

    console.log("\n--- ANALYSIS ---");
    if (result.includes("40 cm")) {
        console.log("✅ '40 cm' rule IS in the context.");
    } else {
        console.log("❌ '40 cm' rule is MISSING from context.");
    }

    if (result.includes("50 cm")) {
        console.log("⚠️ '50 cm' rule (machine room) IS in the context (confractor).");
    }
}

testGlobal().catch(console.error);
