import { google, drive_v3 } from 'googleapis';
import { authorize } from './auth';
import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const FILE_ID = '1Wd_fbyOfsrkhvUJQpmB4ZtfxWOA5ZDzB';
const LOCAL_MANUALS_ROOT = 'C:/Users/dave_/Sentinel cover/manuals_calderas';

async function processSingle() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log(`\nProcessing single file: ${FILE_ID}`);

    const fileRes = await drive.files.get({
        fileId: FILE_ID,
        fields: 'id, name, mimeType',
    });
    const file = fileRes.data;

    const tempPath = path.join(process.cwd(), `temp_drive_${file.id}.pdf`);
    const dest = fs.createWriteStream(tempPath);

    const getRes: any = await drive.files.get(
        { fileId: file.id!, alt: 'media' },
        { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
        getRes.data
            .on('end', () => resolve(true))
            .on('error', (err: any) => reject(err))
            .pipe(dest);
    });

    const dataBuffer = fs.readFileSync(tempPath);
    const pdfData = await pdf(dataBuffer);
    const textContent = pdfData.text.substring(0, 5000);

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            {
                role: "system",
                content: `Ets un assistent expert en calderes i normativa. 
                Analitza el text i determina si és un manual de caldera o un document de normativa.
                
                Si és un manual de caldera:
                Extrau la Marca i el Model. Format: { "type": "manual", "brand": "Marca", "model": "Model" }
                Nota: Victoria, Platinum, Neodens, Luna, Argenta solen ser models de BAXI o ROCA.
                
                Si és normativa:
                Extrau el tema principal. Format: { "type": "normativa", "topic": "Tema" }
                
                Respon NOMÉS amb el JSON.`
            },
            { role: "user", content: textContent }
        ],
        response_format: { type: "json_object" }
    });

    const result = JSON.parse(aiResponse.choices[0].message.content || '{}');
    console.log('AI Result:', result);

    let brand = "";
    let model = "";
    let fileType = "";

    if (result.type === 'manual' && result.brand && result.model) {
        fileType = 'manual';
        brand = result.brand.trim();
        model = result.model.trim();

        // Normalize brand
        if (brand.toUpperCase() === 'ROCA' || brand.toUpperCase() === 'VICTORIA') {
            brand = 'BAXI';
        }

        // Sanitize brand and model for filename
        const safeBrand = brand.replace(/[\/\\?%*:|"<>]/g, '_');
        const safeModel = model.replace(/[\/\\?%*:|"<>]/g, '_');
        const newName = `MANUAL_${safeBrand}_${safeModel}.pdf`.replace(/\s+/g, '_');

        console.log(`Suggested rename: ${file.name} -> ${newName}`);

        await drive.files.update({
            fileId: file.id!,
            requestBody: { name: newName }
        });

        // Normalize brand folder: Roca -> BAXI
        const brandDirName = brand.toUpperCase() === 'ROCA' ? 'BAXI' : brand.toUpperCase();
        const brandDir = path.join(LOCAL_MANUALS_ROOT, brandDirName);
        if (!fs.existsSync(brandDir)) {
            fs.mkdirSync(brandDir, { recursive: true });
        }
        const localPath = path.join(brandDir, newName);
        fs.copyFileSync(tempPath, localPath);
        console.log(`Synced to local: ${localPath}`);

        // Cleanup VICTORIA folder if brandDirName is BAXI
        if (brandDirName === 'BAXI') {
            const victoriaDir = path.join(LOCAL_MANUALS_ROOT, 'VICTORIA');
            if (fs.existsSync(victoriaDir)) {
                console.log('Cleaning up redundant VICTORIA folder...');
                // Moving files from VICTORIA is handled by the script rerunning usually, 
                // but let's be explicit if needed.
            }
        }
    }

    fs.unlinkSync(tempPath);
}

processSingle().catch(console.error);
