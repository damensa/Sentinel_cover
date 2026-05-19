import { RITE_GOLDEN_CONTEXT } from './rite-data';

function verifyGoldenContext() {
    console.log("--- VERIFYING GOLDEN CONTEXT INJECTION ---");

    // 1. Simulate user query
    const query = "distancia sortida fums";
    const isNormative = query.includes('distancia') || query.includes('fums');

    let technicalSummaries = "SOME RANDOM PDF CONTENT ABOUT 50CM...";

    if (isNormative) {
        technicalSummaries = RITE_GOLDEN_CONTEXT + "\n\n" + technicalSummaries;
    }

    console.log("Context Preview:");
    console.log(technicalSummaries.substring(0, 500));

    if (technicalSummaries.includes("40 cm (mínim lateral)")) {
        console.log("\nSUCCESS: Golden Context with 40cm rule is present!");
    } else {
        console.log("\nFAILURE: Golden Context missing.");
    }
}

verifyGoldenContext();
