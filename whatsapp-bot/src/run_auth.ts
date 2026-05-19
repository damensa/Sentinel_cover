import { authorize } from './auth';

async function run() {
    try {
        console.log('Starting authentication...');
        const client = await authorize();
        console.log('Authentication complete!');
        process.exit(0);
    } catch (err) {
        console.error('Authentication failed:', err);
        process.exit(1);
    }
}

run();
