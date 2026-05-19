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

const FOLDER_NAMES = ['Normativa calderes', 'Manuals calderes', 'BAXI'];
const LOCAL_MANUALS_ROOT = 'C:/Users/dave_/Sentinel cover/manuals_calderas';

async function processFolder(drive: drive_v3.Drive, folderId: string, folderName: string) {
    console.log(`\n--- Processing folder: ${folderName} (${folderId}) ---`);

    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
    });

    const files = res.data.files || [];
    console.log(`Found ${files.length} items in ${folderName}.`);

    for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            await processFolder(drive, file.id!, file.name!);
        } else if (file.mimeType === 'application/pdf') {
            console.log(`\nProcessing PDF: ${file.name} (${file.id})`);

            try {
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

                // Determine brand and model
                let brand = "";
                let model = "";
                let fileType = "";

                if (file.name?.startsWith('MANUAL_') || file.name?.startsWith('NORMATIVA_')) {
                    console.log(`File already organized: ${file.name}`);
                    const parts = file.name.split('_');
                    if (file.name.startsWith('MANUAL_')) {
                        fileType = 'manual';
                        brand = parts[1] || "";
                        model = parts.slice(2).join('_').replace('.pdf', '');
                    }
                } else {
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
                                
                                Si és normativa:
                                Extrau el tema principal. Format: { "type": "normativa", "topic": "Tema" }
                                
                                Respon NOMÉS amb el JSON.`
                            },
                            { role: "user", content: textContent }
                        ],
                        response_format: { type: "json_object" }
                    });

                    const result = JSON.parse(aiResponse.choices[0].message.content || '{}');
                    if (result.type === 'manual' && result.brand && result.model) {
                        fileType = 'manual';
                        brand = result.brand.trim();
                        model = result.model.trim();
                        // Sanitize brand and model for filename
                        const safeBrand = brand.replace(/[\/\\?%*:|"<>]/g, '_');
                        const safeModel = model.replace(/[\/\\?%*:|"<>]/g, '_');
                        const newName = `MANUAL_${safeBrand}_${safeModel}.pdf`.replace(/\s+/g, '_');

                        if (newName !== file.name) {
                            console.log(`Renaming Drive file: ${file.name} -> ${newName}`);
                            await drive.files.update({
                                fileId: file.id!,
                                requestBody: { name: newName }
                            });
                            file.name = newName;
                        }
                    } else if (result.type === 'normativa' && result.topic) {
                        const safeTopic = result.topic.trim().replace(/[\/\\?%*:|"<>]/g, '_');
                        const newName = `NORMATIVA_${safeTopic}.pdf`.replace(/\s+/g, '_');
                        if (newName !== file.name) {
                            console.log(`Renaming Drive file: ${file.name} -> ${newName}`);
                            await drive.files.update({
                                fileId: file.id!,
                                requestBody: { name: newName }
                            });
                            file.name = newName;
                        }
                    }
                }

                // Sync to local if it's a manual
                if (brand && fileType === 'manual') {
                    // Normalize brand folder: Roca -> BAXI
                    const brandDirName = brand.toUpperCase() === 'ROCA' ? 'BAXI' : brand.toUpperCase();
                    const brandDir = path.join(LOCAL_MANUALS_ROOT, brandDirName);
                    if (!fs.existsSync(brandDir)) {
                        fs.mkdirSync(brandDir, { recursive: true });
                    }
                    const localPath = path.join(brandDir, file.name!);
                    if (!fs.existsSync(localPath)) {
                        fs.copyFileSync(tempPath, localPath);
                        console.log(`Synced to local: ${localPath}`);
                    } else {
                        console.log(`Already exists locally: ${file.name}`);
                    }
                }

                fs.unlinkSync(tempPath);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }
    }
}

async function organizeDrive() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    for (const folderName of FOLDER_NAMES) {
        const folderRes = await drive.files.list({
            q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const folders = folderRes.data.files;
        if (folders && folders.length > 0) {
            await processFolder(drive, folders[0].id!, folders[0].name!);
        } else {
            console.error(`Folder "${folderName}" not found.`);
        }
    }
}

organizeDrive().catch(console.error);
