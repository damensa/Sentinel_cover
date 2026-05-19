import { google } from 'googleapis';
import { authorize } from '../auth';
import * as fs from 'fs';

export async function getDriveClient() {
    const auth = await authorize();
    return google.drive({ version: 'v3', auth: auth as any });
}

export async function getDocsClient() {
    const auth = await authorize();
    return google.docs({ version: 'v1', auth: auth as any });
}

export async function listFolderFiles(folderId: string) {
    const drive: any = await getDriveClient();
    const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name, mimeType)',
    });
    return res.data.files;
}

export async function getDocText(fileId: string) {
    const doc: any = await getDocsClient();
    const res = await doc.documents.get({ documentId: fileId });
    const text = res.data.body?.content?.map((c: any) =>
        c.paragraph?.elements?.map((e: any) => e.textRun?.content).join('')
    ).join('\n') || '';
    return text;
}

export async function searchFiles(folderId: string, query: string) {
    const drive: any = await getDriveClient();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and name contains '${query}' and trashed = false`,
        fields: 'files(id, name, mimeType)',
    });
    return res.data.files;
}

export async function downloadFile(fileId: string, destPath: string) {
    const drive: any = await getDriveClient();
    const dest = fs.createWriteStream(destPath);
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
        res.data
            .on('end', () => resolve(true))
            .on('error', (err: any) => reject(err))
            .pipe(dest);
    });
}
