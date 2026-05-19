
import { getKeywordContext } from './manual-retriever';

function testInjection() {
    const userText = "quina es la distància de la sortida de fums a una finestra?";
    let normativeQuery = userText;

    // Simulate logic from whatsapp.ts
    const lowerQuery = userText.toLowerCase();
    if (lowerQuery.includes('fum') || lowerQuery.includes('gas') || lowerQuery.includes('sortida') || lowerQuery.includes('tub')) {
        normativeQuery += " distància pendent façana orifici xemeneia distancia pendiente fachada orificio chimenea evacuacion humos 40 cm 60 cm";
    }

    console.log("Original Query:", userText);
    console.log("Injected Query:", normativeQuery);

    // Mock PDF text (Spanish RITE)
    const mockPdfText = "La distancia de la salida de humos a una ventana debe ser de 40 cm según la normativa UNE.";

    console.log("\n--- Testing Retrieval against Spanish Text ---");
    const extractedContext = getKeywordContext(mockPdfText, normativeQuery, 2);

    if (extractedContext.includes("La distancia de la salida de humos")) {
        console.log("SUCCESS: Retrieved Spanish text using injected keywords.");
    } else {
        console.log("FAILURE: Did not retrieve Spanish text.");
    }
}

testInjection();
