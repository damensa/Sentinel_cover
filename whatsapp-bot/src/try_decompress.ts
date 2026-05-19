import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const files = ['xfa_out_datasets.xml', 'xfa_out_template.xml'];

files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        console.log(`Checking ${file}...`);
        // Read as buffer (binary)
        const buffer = fs.readFileSync(filePath);

        try {
            // Try standard unzip (zlib)
            const decoded = zlib.unzipSync(buffer);
            console.log(`✅ Success! Decompressed ${file}.`);
            console.log('Preview:', decoded.toString('utf8').substring(0, 200));
            fs.writeFileSync(filePath + '.decompressed.xml', decoded);
        } catch (e: any) {
            console.log(`❌ Failed to decompress ${file}: ${e.message}`);
            // Check first bytes
            console.log(`First hex bytes: ${buffer.subarray(0, 10).toString('hex')}`);
        }
    }
});
