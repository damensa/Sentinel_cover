import { detectBrand } from './router';
import { getCanonicalBrand, validateBrandModelWithCatalog, normalizeText } from './manual-retriever';

const userText = "Mira'm l'error 01 d'una Viesmann Vitodens";
const extractedBrand = "Viesmann";
const extractedModel = "Vitodens";

console.log('--- DIAGNOSTIC ---');
const localBrand = detectBrand(userText);
console.log('detectBrand result:', localBrand);

const userBrandRaw = (localBrand !== 'normativa') ? localBrand : (extractedBrand || 'normativa');
console.log('userBrandRaw:', userBrandRaw);

const canonicalUserBrand = getCanonicalBrand(userBrandRaw);
console.log('canonicalUserBrand:', canonicalUserBrand);

const isValidInCatalog = validateBrandModelWithCatalog(canonicalUserBrand, extractedModel);
console.log('isValidInCatalog:', isValidInCatalog);

const actualBrandDir = "VIESMANN"; // Simulating the folder name
const canonicalActualBrand = getCanonicalBrand(actualBrandDir);
console.log('canonicalActualBrand:', canonicalActualBrand);

const mismatch = (canonicalUserBrand !== canonicalActualBrand);
console.log('Mismatch detected:', mismatch);
