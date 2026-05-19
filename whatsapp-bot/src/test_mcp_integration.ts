
import { mcpService } from './services/mcp-client';
import { BRAND_ROUTER } from './router';

async function test() {
    console.log("🚀 Testing MCP Integration...");

    // Simulate identifying a brand (e.g., Vaillant)
    const brandKey = 'vaillant'; // Canonical key from router
    const brand = BRAND_ROUTER[brandKey];

    if (!brand) {
        console.error("❌ Brand 'vaillant' not found in router!");
        return;
    }

    console.log(`Target: ${brand.name} (Notebook ID: ${brand.notebookId})`);

    // Using a known error code for Vaillant as a test case
    const query = "Que significa el error F.28 en una Ecotec Pure?";
    console.log(`❓ Query: "${query}"`);
    console.log("⏳ Sending request to MCP (this launches Chrome if needed)...");

    try {
        const response = await mcpService.queryNotebook(brand.notebookId, query);

        console.log("\n✅ RESPONSE FROM NOTEBOOKLM:");
        console.log("===================================================");
        console.log(response);
        console.log("===================================================");

    } catch (error) {
        console.error("❌ Test failed:", error);
    } finally {
        await mcpService.disconnect();
        process.exit(0);
    }
}

test();
