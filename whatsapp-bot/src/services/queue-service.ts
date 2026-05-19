import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
};

export const pdfQueue = new Queue('pdf-generation', { connection });

class QueueService {
    async addPdfJob(type: 'elec1' | 'elec2' | 'dr' | 'contract', data: any, from: string, region: string = 'catalunya') {
        console.log(`[QUEUE] Adding ${type} job for ${from} in ${region}`);
        await pdfQueue.add('generate-pdf', {
            type,
            data,
            from,
            region
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false
        });
    }
}

export const queueService = new QueueService();
