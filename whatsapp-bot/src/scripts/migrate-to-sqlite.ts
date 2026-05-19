import fs from 'fs';
import path from 'path';
import { dbService } from '../services/db';

async function migrate() {
    console.log('[MIGRATION] Starting migration from JSON to SQLite...');

    const jsonPath = path.join(process.cwd(), 'subscriptors.json');

    if (!fs.existsSync(jsonPath)) {
        console.error('[MIGRATION] subscriptors.json not found. Skipping.');
        return;
    }

    try {
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(rawData);

        const subscribers = data.subscriptors || [];
        console.log(`[MIGRATION] Found ${subscribers.length} subscribers in JSON.`);

        for (const wpId of subscribers) {
            console.log(`[MIGRATION] Migrating ${wpId}...`);
            dbService.addSubscriber(wpId);
        }

        console.log('[MIGRATION] Migration completed successfully.');

        // Optionally rename the old file to avoid double migration
        const backupPath = path.join(process.cwd(), 'subscriptors.json.bak');
        fs.renameSync(jsonPath, backupPath);
        console.log(`[MIGRATION] Original JSON renamed to ${path.basename(backupPath)}`);

    } catch (error) {
        console.error('[MIGRATION] Error during migration:', error);
    }
}

migrate();
