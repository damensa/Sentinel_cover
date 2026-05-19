import fs from 'fs';
import path from 'path';

function brandPrefixRegexp(dir: string): RegExp {
    const brandName = path.basename(dir).toLowerCase();
    return new RegExp('^' + brandName);
}

function findInDir(dir: string, model: string): string | null {
    const files = fs.readdirSync(dir);
    console.log(`Checking directory: ${dir} (${files.length} files)`);

    if (!model) {
        const firstPdf = files.find(f => f.toLowerCase().endsWith('.pdf'));
        return firstPdf ? path.join(dir, firstPdf) : null;
    }

    const normalizedModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
    console.log(`Normalized requested model: ${normalizedModel}`);

    // 1. Precise include
    let matchedFile = files.find(f => {
        if (!f.toLowerCase().endsWith('.pdf')) return false;
        const normalizedFile = f.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedFile.includes(normalizedModel);
    });

    if (matchedFile) {
        console.log(`Found via precise match: ${matchedFile}`);
        return path.join(dir, matchedFile);
    }

    // 2. Fallback: Check if the model contains the filename (e.g. searching for "Victoria 20/20" matches "manual_baxi_victoria.pdf")
    matchedFile = files.find(f => {
        if (!f.toLowerCase().endsWith('.pdf')) return false;
        let normalizedFile = f.toLowerCase().replace(/[^a-z0-9]/g, '').replace('manual', '');

        // Remove brand prefix if present
        const brandName = path.basename(dir).toLowerCase();
        if (normalizedFile.startsWith(brandName)) {
            const before = normalizedFile;
            normalizedFile = normalizedFile.substring(brandName.length);
            console.log(`  Substituted brand prefix: ${before} -> ${normalizedFile}`);
        }

        if (normalizedFile.length < 3) return false;

        const isMatch = normalizedModel.includes(normalizedFile);
        console.log(`  Fallback check: File="${f}" NormalizedPart="${normalizedFile}" Model="${normalizedModel}" -> Match=${isMatch}`);
        return isMatch;
    });

    if (matchedFile) {
        console.log(`Found via fallback match: ${matchedFile}`);
        return path.join(dir, matchedFile);
    }

    return null;
}

const BAXI_DIR = 'C:/Users/dave_/Sentinel cover/manuals_calderas/BAXI';
const model = 'Victoria 20/20';
const result = findInDir(BAXI_DIR, model);
console.log('\nResult:', result);
