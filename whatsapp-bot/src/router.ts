import { normalizeText } from './manual-retriever';

export interface BrandConfig {
    name: string;
    notebookId: string;
}

export const BRAND_ROUTER: Record<string, BrandConfig> = {
    'baxi': { name: 'BAXI', notebookId: '3947a498-df30-4f64-b8bd-940f28e94c87' },
    'viessmann': { name: 'Viessmann', notebookId: '9ded3ba2-de16-4f3b-872e-7a726fd2386b' },
    'vaillant': { name: 'Vaillant', notebookId: 'd1154359-6787-4013-a84b-9b6fc14fa27e' },
    'saunier': { name: 'Saunier Duval', notebookId: '2ed81b86-65e4-4851-af78-1d7e84a8dd12' },
    'junkers': { name: 'Junkers', notebookId: '26169c6c-d3eb-4fdd-9bbb-5d12d1bbab8e' },
    'immergas': { name: 'Immergas', notebookId: '7dbf22a0-c2b0-4ab4-a5ed-3623ff6e67c7' },
    'ferroli': { name: 'Ferroli', notebookId: '787da8a9-9ab2-4c7b-967f-d5b7b018371d' },
    'cointra': { name: 'Cointra', notebookId: '0ddb8976-424c-40f6-a976-d3e70cde7823' },
    'ariston': { name: 'Ariston', notebookId: 'b38faa6d-d1e6-4a08-b480-07c86d669295' },
    'chaffoteaux': { name: 'Chaffoteaux', notebookId: '4b648f32-affc-47e2-ad67-e7937858f3a7' },
    'wolf': { name: 'Wolf', notebookId: '52568457-57e7-40df-9e42-ee0cd5b9ad3c' },
    'fagor': { name: 'Fagor', notebookId: 'b99b1712-7086-415a-9629-a532d30c67a1' },
    'normativa': { name: 'NORMATIVA', notebookId: '9a2e737d-1001-4fdb-8c82-f18ea9c8d8dc' }
};

export const BRAND_PHONETICS: Record<string, string> = {
    'bisman': 'viessmann',
    'abismen': 'viessmann',
    'abismat': 'viessmann',
    'biaixement': 'viessmann',
    'biaiximent': 'viessmann',
    'biaixament': 'viessmann',
    'bitodens': 'viessmann',
    'vitodens': 'viessmann',
    'abitodens': 'viessmann',
    'abitudens': 'viessmann',
    'habitodents': 'viessmann',
    'viesman': 'viessmann',
    'vaiman': 'viessmann',
    'viman': 'viessmann',
    'vissman': 'viessmann',
    'biesman': 'viessmann',
    'roca': 'baxi',
    'a favor': 'fagor',
    'afavor': 'fagor',
    'fago': 'fagor',
    'factor': 'fagor',
    'balan': 'vaillant',
    'vailan': 'vaillant',
    'baillante': 'vaillant',
    'saunier': 'saunier',
    'duval': 'saunier',
    'sonier': 'saunier'
};

export function detectBrand(text: string): string {
    const normalized = normalizeText(text);

    // 1. PRIMER: Comprovar fonètiques
    for (const [phonetic, actual] of Object.entries(BRAND_PHONETICS)) {
        if (normalized.includes(normalizeText(phonetic))) return actual;
    }

    // 2. SEGON: Comprovar claus directes
    for (const key in BRAND_ROUTER) {
        if (key === 'normativa') continue;
        if (normalized.includes(normalizeText(key))) return key;
    }

    return 'desconeguda';
}
