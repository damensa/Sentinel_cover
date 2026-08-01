import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { WebSocketServer, type WebSocket } from 'ws';
import http from 'http';
import type { AddressInfo } from 'net';
import { GeminiLiveClient } from './gemini-live-client';
import { sessionStore } from './session-store';
import { schemaLoader, type DocType, type Region } from '../schemas/loader';

const PORT = Number(process.env.GATEWAY_PORT ?? 3001);
const API_KEY = process.env.GEMINI_API_KEY;

// Origen(s) autoritzat(s) per CORS. Per defecte accepta els ports de dev de
// Vite (5173) i preview (4173). A producció, defineix CORS_ORIGIN al .env.
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, hasKey: !!API_KEY, port: PORT });
});

// POST /session { region, docType } → { sessionId, wsUrl }
app.post('/session', (req, res) => {
  const { region, docType } = req.body ?? {};
  if (!isRegion(region) || !isDocType(docType)) {
    return res.status(400).json({ error: "region i docType requerits" });
  }
  const s = sessionStore.create(region, docType);
  res.json({ sessionId: s.id, wsUrl: `/ws/${s.id}` });
});

// POST /session/:id/submit → valida i retorna el JSON acumulat (integració amb
// FormFillerService vindrà en un pas posterior).
app.post('/session/:id/submit', (req, res) => {
  const s = sessionStore.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'session not found' });
  const v = schemaLoader.validate(s.region, s.docType, s.fields);
  if (!v.valid) {
    return res.status(422).json({ ok: false, errors: v.errors, fields: s.fields });
  }
  res.json({ ok: true, fields: s.fields });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '';
  const match = url.match(/^\/ws\/([a-f0-9-]{36})$/i);
  if (!match) {
    socket.destroy();
    return;
  }
  const sessionId = match[1];
  const session = sessionStore.get(sessionId);
  if (!session) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    handleClient(ws, sessionId).catch((e) => {
      sendEvent(ws, { type: 'error', message: String((e as Error).message ?? e) });
      ws.close();
    });
  });
});

async function handleClient(ws: WebSocket, sessionId: string): Promise<void> {
  if (!API_KEY) {
    sendEvent(ws, { type: 'error', message: 'GEMINI_API_KEY no configurada al servidor' });
    ws.close();
    return;
  }
  const session = sessionStore.get(sessionId);
  if (!session) return;

  const gemini = new GeminiLiveClient(API_KEY);
  let ready = false;
  const audioBuffer: string[] = [];
  const MAX_BUFFER = 200;
  let audioChunkCount = 0;
  let audioByteCount = 0;
  let modelAudioChunks = 0;
  let modelAudioBytes = 0;

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = data as Buffer;
      audioChunkCount++;
      audioByteCount += buf.length;
      if (audioChunkCount === 1 || audioChunkCount % 20 === 0) {
        console.log(`[gateway] àudio in: ${audioChunkCount} chunks, ${audioByteCount} bytes`);
      }
      const b64 = buf.toString('base64');
      if (!ready) {
        if (audioBuffer.length < MAX_BUFFER) audioBuffer.push(b64);
        return;
      }
      try {
        gemini.sendAudio(b64);
      } catch (e) {
        console.error('[gateway] sendAudio:', (e as Error).message);
        sendEvent(ws, { type: 'error', message: `sendAudio: ${(e as Error).message}` });
      }
      return;
    }
    // JSON control messages.
    let parsed: any;
    try { parsed = JSON.parse((data as Buffer).toString('utf8')); }
    catch { return; }
    if (parsed?.type === 'text' && typeof parsed.text === 'string') {
      if (!ready) return;
      console.log(`[gateway] text in: ${parsed.text.slice(0, 60)}`);
      gemini.sendText(parsed.text);
    } else if (parsed?.type === 'audio_stream_end') {
      console.log(`[gateway] audio_stream_end (torn tancat, ${audioChunkCount} chunks totals aquest torn)`);
      audioChunkCount = 0;
      audioByteCount = 0;
      if (ready) {
        try { gemini.sendAudioStreamEnd(); }
        catch (e) { console.error('[gateway] sendAudioStreamEnd:', (e as Error).message); }
      }
    }
  });

  ws.on('close', () => gemini.close());
  ws.on('error', (e) => {
    console.error('[gateway] WS error:', (e as Error).message);
    gemini.close();
  });

  try {
    await gemini.connect(session.region, session.docType, {
      onFunctionCall: ({ name, args, callId }) => {
        console.log(`[gateway] Gemini function_call ${name}:`, JSON.stringify(args).slice(0, 200));
        const partial = (args ?? {}) as Record<string, any>;
        const updated = sessionStore.mergeFields(sessionId, partial);
        sendEvent(ws, { type: 'field_update', fields: updated?.fields ?? partial, delta: partial });
        gemini.sendFunctionResponse(callId, name, { ok: true });
      },
      onModelText: (text) => {
        console.log(`[gateway] Gemini text: ${text.slice(0, 80)}`);
        sendEvent(ws, { type: 'model_text', text });
      },
      onModelAudio: (base64) => {
        modelAudioChunks++;
        modelAudioBytes += Math.floor((base64.length * 3) / 4);
        if (modelAudioChunks === 1 || modelAudioChunks % 20 === 0) {
          console.log(`[gateway] Gemini àudio out: ${modelAudioChunks} chunks, ${modelAudioBytes} bytes`);
        }
        sendEvent(ws, { type: 'model_audio', data: base64 });
      },
      onTurnComplete: () => {
        console.log('[gateway] Gemini turn_complete');
        sendEvent(ws, { type: 'turn_complete' });
      },
      onError: (err) => {
        console.error('[gateway] Gemini error:', err);
        sendEvent(ws, { type: 'error', message: String((err as any)?.message ?? err) });
      },
      onClose: () => sendEvent(ws, { type: 'session_end' }),
    });
    ready = true;
    // Drenem el buffer d'àudio que s'havia acumulat mentre esperàvem Gemini.
    console.log(`[gateway] Gemini connectat; drenant ${audioBuffer.length} chunks bufferitzats`);
    for (const b64 of audioBuffer) gemini.sendAudio(b64);
    audioBuffer.length = 0;
  } catch (e) {
    console.error('[gateway] gemini.connect failed:', (e as Error).message);
    sendEvent(ws, { type: 'error', message: `connect: ${(e as Error).message}` });
    ws.close();
  }
}

function sendEvent(ws: WebSocket, evt: Record<string, any>): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(evt));
}

function isRegion(v: unknown): v is Region {
  return v === 'catalunya';
}

function isDocType(v: unknown): v is DocType {
  return v === 'elec1' || v === 'dr' || v === 'contracte' || v === 'elec2' || v === 'dictamen';
}

if (require.main === module) {
  server.listen(PORT, () => {
    const addr = server.address() as AddressInfo;
    console.log(`Gateway escoltant a http://localhost:${addr.port}`);
    console.log(`  POST http://localhost:${addr.port}/session { region, docType }`);
    console.log(`  WS   ws://localhost:${addr.port}/ws/:sessionId`);
    console.log(`  API key ${API_KEY ? 'OK' : 'FALTA (configura GEMINI_API_KEY al .env)'}`);
  });
}

export { app, server };
