import { listFolderFiles } from './services/google';
import { BRAND_ROUTER } from './router';

async function verifyAccess() {
    console.log("--- VERIFYING ACCESS TO KNOWLEDGE BASE FOLDERS ---");

    const foldersToTest = [
        BRAND_ROUTER['normativa']
    ];

    for (const folder of foldersToTest) {
        console.log(`\n📂 Checking folder: ${folder.name} (ID: ${folder.notebookId})`);
        try {
            const files = await listFolderFiles(folder.notebookId);
            if (files && files.length > 0) {
                console.log(`✅ ACCESS CONFIRMED. Found ${files.length} files.`);
                console.log(`   Sample files:`);
                files.slice(0, 3).forEach((f: any) => console.log(`   - ${f.name} (${f.mimeType})`));
            } else {
                console.log(`⚠️ ACCESS OK, BUT FOLDER EMPTY.`);
            }
        } catch (error: any) {
            console.error(`❌ ACCESS DENIED or ERROR:`, error.message);
        }
    }
}

verifyAccess().catch(console.error);
