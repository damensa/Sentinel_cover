import path from 'path';
import fs from 'fs';

// simple text splitter implementation to avoid external dependencies
function splitText(text: string, chunkSize: number = 1000, chunkOverlap: number = 200) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.substring(start, end));
        start += (chunkSize - chunkOverlap);
    }
    return chunks;
}

async function reproduceRetrieval() {
    console.log('--- REPRODUCING RETRIEVAL (MANUAL SPLITTER) ---');

    // 1. Load the RITE dump
    const dumpPath = path.join(process.cwd(), 'rite_full_dump.txt');
    if (!fs.existsSync(dumpPath)) {
        console.error('Run debug_rite_extraction.ts first to generate the dump!');
        return;
    }
    const fullText = fs.readFileSync(dumpPath, 'utf-8');

    // 2. Split with default settings
    const chunks = splitText(fullText, 1000, 200);
    console.log(`Split into ${chunks.length} chunks.`);

    // 3. Simulate Search
    // Query: "distància sortida fums finestres 40 cm"
    const queryTerms = ['distancia', 'ventana', '40 cm', '40cm', 'defectores', 'IT 1.3.4'];

    console.log(`Query Terms: ${queryTerms.join(', ')}`);

    const scores = chunks.map((chunk, i) => {
        const content = chunk.toLowerCase();
        let score = 0;
        let hits = [];

        for (const term of queryTerms) {
            if (content.includes(term.toLowerCase())) {
                score++;
                hits.push(term);
            }
        }

        // Boost for specific "40 cm" target to mimic vector similarity on exact match
        if (content.includes('40 cm') || content.includes('2,20')) score += 5;

        return { index: i, score, hits, content: chunk };
    });

    // 4. Sort and Show Top Results
    scores.sort((a, b) => b.score - a.score);

    console.log('\n--- TOP 3 CHUNKS ---');
    for (let i = 0; i < 3; i++) {
        const res = scores[i];
        console.log(`\nRANK #${i + 1} (Score: ${res.score}) [Hits: ${res.hits.join(', ')}]`);
        console.log(res.content.substring(0, 300).replace(/\n/g, ' ') + '...');

        if (res.content.includes('40 cm')) {
            console.log('>>> CONTAINS 40 CM TARGET <<<');
        } else {
            console.log('>>> MISSING TARGET <<<');
        }
    }
}

reproduceRetrieval().catch(console.error);
