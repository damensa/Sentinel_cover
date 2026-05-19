import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { FormFillerService } from './services/form-filler';
import { client } from './whatsapp';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import fs from 'fs';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
};

const formFiller = new FormFillerService();

export const pdfWorker = new Worker('pdf-generation', async (job: Job) => {
    const { type, data, from, region } = job.data;
    console.log(`[WORKER] Processing ${type} for ${from} in ${region || 'default'}...`);

    try {
        let pdfPath = '';

        switch (type) {
            case 'elec1':
                pdfPath = await formFiller.fillELEC1PDF(data, region);
                break;
            case 'elec2':
                pdfPath = await formFiller.fillElec2PDF(data); // Elec2 is currently generic
                break;
            case 'dr':
                pdfPath = await formFiller.fillDRPDF(data, region);
                break;
            case 'contract':
                pdfPath = await formFiller.fillContractPDF(data, region);
                break;
        }

        if (pdfPath && fs.existsSync(pdfPath)) {
            const media = MessageMedia.fromFilePath(pdfPath);
            await client.sendMessage(from, media, { caption: `✅ Aquí tens el teu document (${type.toUpperCase()}) generat rectament.` });
            console.log(`[WORKER] Sent ${type} to ${from}`);

            // Cleanup temp file
            // fs.unlinkSync(pdfPath); 
        } else {
            throw new Error('PDF path not found or empty');
        }

    } catch (error: any) {
        console.error(`[WORKER] Error processing ${type} for ${from}:`, error);
        await client.sendMessage(from, `❌ Ho sento, hi ha hagut un error generant el teu PDF (${type.toUpperCase()}). Si us plau, torna-ho a provar més tard.`);
        throw error; // Let BullMQ handle retries
    }
}, { connection, concurrency: 1 });

pdfWorker.on('completed', (job) => {
    console.log(`[WORKER] Job ${job.id} completed!`);
});

pdfWorker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed with error: ${err.message}`);
});
