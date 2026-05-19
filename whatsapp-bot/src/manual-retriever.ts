import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');
import { OpenAI } from 'openai';

const MANUALS_DIR = 'C:/Users/dave_/Sentinel cover/manuals_calderas';

// Catàleg mestre Sentinel (Reflex exacte de les notes de NotebookLM)
const BRAND_CATALOG: Record<string, string[]> = {
    "VAILLANT": ["ECOTEC", "TURBOTEC", "ATMOTEC", "VCW", "SINE-MOT", "TURBOMAG", "ATMOMAG", "AROTHERM", "UNITOWER"],
    "SAUNIER DUVAL": ["GENIA-AIR", "THEMAFAST", "THELIA", "ISOFAST", "ISOMAX", "THEMACLASSIC", "COMBITEK", "OPALIA", "SUPERCONFORT"],
    "FERROLI": ["DOMIPROJECT", "DOMICOMPACT", "DOMINA", "DIVATECH", "DIVACONDENS", "BLUEHELIX", "HITECH", "MAXIMA", "KALIS", "ZEFIRO", "ZEUS"],
    "COINTRA": ["SUPERLATIVE", "ESSENTIAL", "PERFECT", "EXCELLENT", "SUPREME", "CPA", "CPB", "CPE-T", "ZEFIRO"],
    "ARISTON": ["CLAS ONE", "GENUS ONE", "ALTEAS ONE", "CARES S", "CLAS PREMIUM", "NUOS", "NIMBUS", "FAST R", "NEXT EVO", "SENSYS", "CUBE S"],
    "CHAFFOTEAUX": ["PIGMA", "URBIA", "MIRA", "NIAGARA", "INOA GREEN", "TALIA", "ARIANEXT", "AQUANEXT", "FLUENDO", "AVENIR"],
    "IMMERGAS": ["VICTRIX", "TERA", "OMNIA", "SUPERIOR", "ZEUS", "EXTRA", "JULIUS", "CAESAR", "MAGIS", "TRIO", "CAR V2", "SMARTECH"],
    "VIESSMANN": ["VITODENS", "BITODENS", "VITOCAL", "VITOTROL", "VICARE", "VITOTRONIC", "VITOCONNECT", "OPTO2"],
    "FAGOR": ["FEP", "FEG", "FEC", "THERMOSTATIC", "FEB", "NATUR", "SERIE M", "RB", "CB", "N3W"],
    "WOLF": ["CGB-2", "FGB", "MGK-2", "CHA MONOBLOCK", "BWL-1S", "BM-2", "LINK HOME", "MM-2", "KM-2"],
    "BAXI": ["VICTORIA", "NEOBIT", "SARA", "NORA", "PLATINUM", "LAURA", "NEODENS", "NOVADENS", "NOVANOX", "AQUATECH", "BIOS", "ARGENTA", "GAVINA"]
};

export interface ModelMatch {
    brand: string | null;
    model: string | null;
    errorCode: string | null;
    filePath?: string;
    actualBrandDir?: string;
    observation?: string;
}

/**
 * Normalitza el text eliminant accents i caràcters especials.
 */
export function normalizeText(text: string): string {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retorna el nom canònic de la marca (en MAJÚSCULES) a partir de qualsevol variant.
 */
export function getCanonicalBrand(brand: string | null): string {
    if (!brand) return "DESCONEGUDA";

    const b = brand.toLowerCase();
    const map: Record<string, string> = {
        'baxi': 'BAXI', 'roca': 'BAXI', 'victoria': 'BAXI',
        'viessmann': 'VIESSMANN', 'viesmann': 'VIESSMANN', 'vissman': 'VIESSMANN', 'bisman': 'VIESSMANN', 'abismen': 'VIESSMANN', 'biaixement': 'VIESSMANN', 'biaiximent': 'VIESSMANN', 'wiesmann': 'VIESSMANN', 'wiesman': 'VIESSMANN', 'wiesmen': 'VIESSMANN',
        'vaillant': 'VAILLANT', 'vailan': 'VAILLANT', 'balan': 'VAILLANT', 'vailant': 'VAILLANT', 'baillant': 'VAILLANT',
        'saunier duval': 'SAUNIER DUVAL', 'saunier': 'SAUNIER DUVAL', 'duval': 'SAUNIER DUVAL', 'sonier': 'SAUNIER DUVAL',
        'fagor': 'FAGOR', 'fago': 'FAGOR', 'a favor': 'FAGOR', 'afavor': 'FAGOR',
        'ferroli': 'FERROLI', 'junkers': 'JUNKERS', 'immergas': 'IMMERGAS', 'ariston': 'ARISTON', 'chaffoteaux': 'CHAFFOTEAUX', 'wolf': 'WOLF', 'cointra': 'COINTRA'
    };

    // Busquem coincidència exacta o parcial
    for (const [variant, canonical] of Object.entries(map)) {
        if (b === variant || b.includes(variant) || variant.includes(b)) return canonical;
    }

    return brand.toUpperCase();
}

/**
 * Retorna el nom canònic del model a partir de variants fonètiques comunes.
 */
export function getCanonicalModel(brand: string | null, model: string | null): string | null {
    if (!model) return null;
    const m = normalizeText(model);

    // Alias de models per marca
    const modelAliases: Record<string, Record<string, string>> = {
        'VIESSMANN': {
            'bitodens': 'VITODENS',
            'vitedens': 'VITODENS',
            'vitodens': 'VITODENS'
        },
        'BAXI': {
            'victoria': 'VICTORIA',
            'neodens': 'NEODENS',
            'platinum': 'PLATINUM'
        }
    };

    const canonicalBrand = getCanonicalBrand(brand);
    const brandAliases = modelAliases[canonicalBrand];

    if (brandAliases) {
        for (const [variant, canonical] of Object.entries(brandAliases)) {
            if (m === variant || m.includes(variant) || variant.includes(m)) return canonical;
        }
    }

    return model.toUpperCase();
}

export async function extractBrandAndModel(text: string, openai: OpenAI): Promise<ModelMatch> {
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            {
                role: "system",
                content: `Ets l'expert tècnic de SentinelCover. 
                Extrau marca, model i codi d'error en JSON.
                Important: Extrau la marca EXACTAMENT com la diu l'usuari (encara que sigui incorrecta).
                Si diu 'Bisman' posa 'Bisman'. Si diu 'Roca' posa 'Roca'.
                Output JSON: { brand: string | null, model: string | null, errorCode: string | null }.`
            },
            { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
        brand: result.brand,
        model: result.model,
        errorCode: result.errorCode
    };
}

export function findManualFile(brand: string | null, model: string | null): { filePath: string | null, actualBrandDir: string | null } {
    if (!brand && !model) return { filePath: null, actualBrandDir: null };

    let normalizedBrand = getCanonicalBrand(brand);
    let canonicalModel = getCanonicalModel(brand, model);
    let searchModel = canonicalModel || "";

    console.log(`🔍 Sentinel Search: Brand=${normalizedBrand}, Model=${searchModel}`);

    let matchedFilePath: string | null = null;
    let actualBrandDir: string | null = null;

    // --- PAS 1: CERCA A LA CARPETA DE LA MARCA INDICADA ---
    if (normalizedBrand) {
        const dirs = fs.readdirSync(MANUALS_DIR);
        const searchBrandNormalized = normalizeText(normalizedBrand);
        const matchedDir = dirs.find(d => {
            const dirNorm = normalizeText(d);
            return dirNorm === searchBrandNormalized || dirNorm.includes(searchBrandNormalized) || searchBrandNormalized.includes(dirNorm);
        });

        if (matchedDir) {
            actualBrandDir = matchedDir;
            matchedFilePath = findInDir(path.join(MANUALS_DIR, matchedDir), searchModel);
        }
    }

    // --- PAS 2: FALLBACK (CERCA GLOBAL SI NO S'HA TROBAT A LA MARCA) ---
    if (!matchedFilePath && searchModel) {
        console.log(`🌐 Cerca global per model: ${searchModel}`);
        const dirs = fs.readdirSync(MANUALS_DIR);
        for (const dir of dirs) {
            const filePath = findInDir(path.join(MANUALS_DIR, dir), searchModel);
            if (filePath) {
                console.log(`✅ Trobat al fallback: ${dir}`);
                return { filePath, actualBrandDir: dir };
            }
        }
    }

    return { filePath: matchedFilePath, actualBrandDir };
}

/**
 * Busca contingut rellevant al voltant de l'error per no tallar el context.
 */
export function getSmartContext(manualText: string, errorCode: string | null): string {
    if (!errorCode) return manualText.substring(0, 10000);

    const code = errorCode.toUpperCase();
    const searchPatterns = [
        ` ${code} `,
        `-${code}`,
        `:${code}`,
        `COD. ${code}`,
        `ERROR ${code}`,
        `F${code}`,
        `E${code}`,
        `F.${code}`,
        `E.${code}`,
        `CÒD. ${code}`,
        `TAULA ${code}`
    ];

    let segments: string[] = [];
    let found = false;

    // Busquem els primers 3 llocs on aparegui algun patró
    for (const pattern of searchPatterns) {
        let index = manualText.toUpperCase().indexOf(pattern);
        if (index !== -1) {
            found = true;
            const start = Math.max(0, index - 2000);
            const end = Math.min(manualText.length, index + 3000);
            segments.push(`[...CONTEXT AL VOLTANT DE "${pattern}"...]\n` + manualText.substring(start, end));
            if (segments.length >= 2) break;
        }
    }

    if (!found) {
        return manualText.substring(0, 10000);
    }

    // Retornem els segments units (màxim 15k-20k per no excedir context)
    return segments.join("\n\n---\n\n").substring(0, 15000);
}

/**
 * Busca segments de text rellevants basats en paraules clau de la consulta.
 * Útil per a documents normatius grans on no hi ha un codi d'error específic.
 */
export function getKeywordContext(text: string, query: string, limit: number = 2): string {
    if (!query) return text.substring(0, 10000);

    // Paraules clau genèriques a ignorar
    const ignore = new Set(['com', 'sha', 'de', 'fer', 'la', 'una', 'segons', 'per', 'que', 'els', 'les', 'del', 'dels', 'amb', 'pel', 'pels']);

    // Extraure paraules netes de la consulta
    const keywords = query.toLowerCase()
        .replace(/[^a-z0-9àéèíóòúüñç\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !ignore.has(w));

    if (keywords.length === 0) return text.substring(0, 10000);

    let segments: string[] = [];
    const textUpper = text.toUpperCase();
    const seenIndices: number[] = [];

    // Per cada paraula clau, busquem fins a 'limit' aparicions
    for (const word of keywords) {
        const wordUpper = word.toUpperCase();
        let lastIndex = -1;

        for (let i = 0; i < limit; i++) {
            let index = textUpper.indexOf(wordUpper, lastIndex + 1);
            if (index === -1) break;

            // Evitem duplicats propers
            if (seenIndices.some(si => Math.abs(si - index) < 2000)) {
                lastIndex = index;
                continue;
            }

            const start = Math.max(0, index - 1500);
            const end = Math.min(text.length, index + 2500);
            segments.push(`[...RELEVANTE: "${word}"...]\n` + text.substring(start, end));
            seenIndices.push(index);
            lastIndex = index;

            if (segments.length >= 8) break; // Màxim 8 segments totals
        }
        if (segments.length >= 8) break;
    }

    if (segments.length === 0) return text.substring(0, 10000);

    // Unim i limitem a ~30k-40k caràcters per seguretat (OpenAI TPM)
    return segments.join("\n\n---\n\n").substring(0, 40000);
}

function findInDir(dir: string, model: string): string | null {
    const files = fs.readdirSync(dir);

    if (!model) {
        const firstPdf = files.find(f => f.toLowerCase().endsWith('.pdf'));
        return firstPdf ? path.join(dir, firstPdf) : null;
    }

    const searchPattern = normalizeText(model);

    // Cerca precisa primer
    let matchedFile = files.find(f => {
        if (!f.toLowerCase().endsWith('.pdf')) return false;
        const fileName = normalizeText(f.replace('.pdf', ''));
        return fileName === searchPattern;
    });

    if (!matchedFile) {
        // Cerca parcial
        matchedFile = files.find(f => {
            if (!f.toLowerCase().endsWith('.pdf')) return false;
            const fileName = normalizeText(f.replace('.pdf', ''));
            return fileName.includes(searchPattern) || searchPattern.includes(fileName);
        });
    }

    return matchedFile ? path.join(dir, matchedFile) : null;
}

export async function getManualText(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

export function validateErrorCode(manualText: string, errorCode: string | null): boolean {
    if (!errorCode) return true;
    const normalizedError = normalizeText(errorCode).toUpperCase();
    const textToCheck = normalizeText(manualText).toUpperCase();
    return textToCheck.includes(normalizedError);
}

/**
 * Valida si un model pertany a una marca segons el BRAND_CATALOG mestre.
 */
export function validateBrandModelWithCatalog(brand: string | null, model: string | null): boolean {
    if (!brand || !model) return true;

    const canonicalBrand = getCanonicalBrand(brand);
    const searchModel = normalizeText(model);

    const catalogModels = BRAND_CATALOG[canonicalBrand];
    if (!catalogModels) return true;

    return catalogModels.some(m => {
        const mNorm = normalizeText(m);
        return searchModel.includes(mNorm) || mNorm.includes(searchModel);
    });
}