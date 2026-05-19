import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents.readonly'
];

const CREDENTIALS_PATH = 'C:/Users/dave_/Sentinel cover/BOT/client_secret_203785551396-75r00ed1v0sdfe5lpg24s3k0ovrnvar5.apps.googleusercontent.com.json';
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

export async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
        console.error(`Checking for token at: ${TOKEN_PATH}`);
        const content = await fs.readFile(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        console.error('Found existing token.json');
        return google.auth.fromJSON(credentials) as any as OAuth2Client;
    } catch (err) {
        console.error('No existing token.json found.');
        return null;
    }
}

export async function saveCredentials(client: OAuth2Client): Promise<void> {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

export async function authorize(): Promise<OAuth2Client> {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        console.error('Authorized using saved credentials.');
        return client;
    }
    console.error('Starting fresh authentication flow...');
    console.error(`Using credentials from: ${CREDENTIALS_PATH}`);
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    console.error('Authentication successful.');
    if (client.credentials) {
        console.error('Saving new credentials...');
        await saveCredentials(client);
    }
    return client;
}
