import { findManualFile } from './manual-retriever';

async function debug() {
    console.log('--- Debugging Roca Victoria 20/20 ---');
    const result = findManualFile('Roca', 'Victoria 20/20');
    console.log('\nFinal Result:', result);
}

debug().catch(console.error);
