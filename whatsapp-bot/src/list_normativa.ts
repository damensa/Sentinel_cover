import { listFolderFiles } from './services/google';
import * as fs from 'fs';

async function listNormativa() {
    const folderId = '1dwGgOz5yR4d32gNrbPQud8TLPytPMFeL';
    console.log(`Listing files in Normativa folder: ${folderId}`);
    const files = await listFolderFiles(folderId);
    fs.writeFileSync('normativa_files.json', JSON.stringify(files, null, 2));
    console.log('Saved to normativa_files.json');
}

listNormativa().catch(console.error);
