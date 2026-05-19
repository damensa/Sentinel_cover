import fs from 'fs';
import path from 'path';
import { getManualText } from './manual-retriever';
import { downloadFile, listFolderFiles } from './services/google';

interface Chunk {
    fileId: string;
    fileName: string;
    content: string;
    score: number;
}

// Multilingual keyword mapping (Catalan -> Spanish/Technical)
const KEYWORD_MAP: Record<string, string[]> = {
    'fums': ['humos', 'evacuación', 'chimenea', 'salida', 'productos', 'combustión'],
    'xemeneia': ['chimenea', 'humos', 'conducto'],
    'distància': ['distancia', 'separación', 'alejamiento', 'cm', 'm'],
    'distancia': ['distancia', 'separación'],
    'finestra': ['ventana', 'apertura', 'hueco', 'marco'],
    'façana': ['fachada', 'exterior', 'patio', 'pared'],
    'pati': ['patio', 'recinto'],
    'sala': ['sala', 'local', 'recinto'],
    'màquines': ['máquinas', 'equipos'],
    'caldera': ['caldera', 'generador', 'aparato'],
    'tub': ['tubo', 'conducto'],
    'pendent': ['pendiente', 'inclinación'],
    'sortida': ['salida', 'evacuación', 'expulsión'], // Added based on debugging
    'rite': ['rite', 'reglamento', 'instalaciones'],
    'gas': ['gas', 'combustible']
};

function expandQuery(query: string): string[] {
    const words = query.toLowerCase().replace(/[^a-z0-9àéèíóòúüñç]/g, ' ').split(/\s+/);
    const expanded = new Set<string>(words);

    for (const word of words) {
        if (KEYWORD_MAP[word]) {
            KEYWORD_MAP[word].forEach(w => expanded.add(w));
        }
    }
    return Array.from(expanded).filter(w => w.length > 2);
}

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.substring(start, end));
        start += (chunkSize - overlap);
    }
    return chunks;
}

export async function globalNormativeSearch(query: string, folderId: string, topK: number = 5): Promise<string> {
    console.log(`🌍 Starting Global Normative Search for: "${query}"`);

    // 1. Get all files in Normativa folder
    const files = await listFolderFiles(folderId);
    console.log(`📂 Found ${files?.length || 0} files in folder ${folderId}`);

    const pdfFiles = files?.filter((f: any) => f.mimeType === 'application/pdf') || [];
    console.log(`📑 PDF Files needed to scan: ${pdfFiles.length}`);

    if (pdfFiles.length === 0) return "No s'han trobat documents normatius PDF.";

    const allChunks: Chunk[] = [];
    const keywords = expandQuery(query);
    console.log(`🔑 Expanded Keywords: ${keywords.join(', ')}`);

    // 2. Process each file
    for (const file of pdfFiles) {
        try {
            console.log(`📄 Processing ${file.name} (${file.id})...`);
            const tmpPath = path.join(process.cwd(), `temp_norm_${file.id}.pdf`);
            await downloadFile(file.id, tmpPath);

            const text = await getManualText(tmpPath);
            const chunks = chunkText(text); // default 1000/200

            // Score chunks
            for (const content of chunks) {
                let score = 0;
                let hits = [];
                const contentLower = content.toLowerCase();

                for (const kw of keywords) {
                    if (contentLower.includes(kw)) {
                        score++;
                        hits.push(kw);
                    }
                }

                // Bonus for exact phrases or crucial numbers
                if (contentLower.includes('40 cm')) score += 5;
                if (contentLower.includes('2,20')) score += 3;
                if (contentLower.includes('it 1.3')) score += 3;
                if (contentLower.includes('une 60670')) score += 3;

                if (score > 0) {
                    // Log relevant hits for debugging
                    if (score >= 5) {
                        console.log(`🎯 HIGH SCORE CHUNK (${score}) in ${file.name}: Hits=[${hits.join(', ')}]`);
                    }

                    allChunks.push({
                        fileId: file.id,
                        fileName: file.name,
                        content,
                        score
                    });
                }
            }

            fs.unlinkSync(tmpPath);
        } catch (e) {
            console.error(`❌ Error processing ${file.name}:`, e);
            // Ensure temp file is cleaned up on error
            try {
                const tmpPath = path.join(process.cwd(), `temp_norm_${file.id}.pdf`);
                if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            } catch (cleanupErr) { /* ignore */ }
        }
    }

    // 3. Global Ranking
    allChunks.sort((a, b) => b.score - a.score);

    const topChunks = allChunks.slice(0, topK);
    console.log(`🏆 Selected top ${topChunks.length} chunks from ${allChunks.length} candidates.`);

    topChunks.forEach((c, i) => {
        console.log(`Rank #${i + 1}: ${c.fileName} (Score: ${c.score})`);
    });

    return topChunks.map(c => `--- EXTRACTE NORMATIU (${c.fileName}) [Score: ${c.score}] ---\n${c.content}\n`).join('\n');
}
