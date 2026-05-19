import fs from 'fs/promises';
import path from 'path';

const SENTINEL_DIR = 'C:/Users/dave_/Sentinel cover';

export async function readSentinelFile(relativePath: string) {
    const fullPath = path.join(SENTINEL_DIR, relativePath);
    return await fs.readFile(fullPath, 'utf-8');
}

export async function listSentinelFiles(relativePath: string = '') {
    const fullPath = path.join(SENTINEL_DIR, relativePath);
    return await fs.readdir(fullPath);
}
