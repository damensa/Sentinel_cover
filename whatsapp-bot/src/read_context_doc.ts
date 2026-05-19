import { google } from 'googleapis';
import { authorize } from './auth';

async function readDoc() {
    const auth = await authorize();
    const docs = google.docs({ version: 'v1', auth: auth as any });

    const fileId = '1WMg3vDV1kF5nslZo8P4sx6fI9lNNUzVsxMNYYQ-KTcjE';
    console.log(`Reading Google Doc: ${fileId}`);

    const doc = await docs.documents.get({ documentId: fileId });
    const text = doc.data.body?.content?.map((c: any) =>
        c.paragraph?.elements?.map((e: any) => e.textRun?.content).join('')
    ).join('\n') || '';

    console.log('--- CONTENT START ---');
    console.log(text);
    console.log('--- CONTENT END ---');
}

readDoc().catch(console.error);
