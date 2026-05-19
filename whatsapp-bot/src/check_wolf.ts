import { listFolderFiles } from './services/google';

async function checkWolfFolder() {
    const wolfId = '17u_n8ESkAMW22TMMAT8yNWl_ApkvQuAP';
    console.log(`Checking Wolf folder: ${wolfId}`);
    try {
        const files = await listFolderFiles(wolfId);
        console.log('Files found:', JSON.stringify(files, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkWolfFolder();
