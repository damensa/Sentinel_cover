import { listFolderFiles } from './services/google';

async function checkNormativaFolder() {
    const normativaId = '1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL';
    console.log(`Checking Normativa folder: ${normativaId}`);
    try {
        const files = await listFolderFiles(normativaId);
        console.log('Files found:', JSON.stringify(files, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkNormativaFolder();
