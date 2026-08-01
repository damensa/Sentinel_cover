export type Region = 'catalunya';
export type DocType = 'elec1' | 'dr' | 'contracte' | 'elec2' | 'dictamen';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3001';

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
}

export async function createSession(
  region: Region,
  docType: DocType,
): Promise<CreateSessionResponse> {
  const res = await fetch(`${GATEWAY_URL}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region, docType }),
  });
  if (!res.ok) throw new Error(`POST /session ${res.status}`);
  return res.json();
}

export async function submitSession(
  sessionId: string,
): Promise<{ ok: boolean; fields: any; errors?: any[] }> {
  const res = await fetch(`${GATEWAY_URL}/session/${sessionId}/submit`, {
    method: 'POST',
  });
  return res.json();
}

// Events que el gateway envia via WS. Coincideix amb el que emet server.ts.
export type GatewayEvent =
  | { type: 'field_update'; fields: Record<string, any>; delta: Record<string, any> }
  | { type: 'model_text'; text: string }
  | { type: 'model_audio'; data: string }
  | { type: 'turn_complete' }
  | { type: 'session_end' }
  | { type: 'error'; message: string };

export interface GatewayWs {
  send: (audioPcm16k: ArrayBuffer) => void;
  sendText: (text: string) => void;
  sendAudioStreamEnd: () => void;
  close: () => void;
}

export function openGatewayWs(
  sessionId: string,
  onEvent: (evt: GatewayEvent) => void,
  onOpen?: () => void,
  onClose?: () => void,
): GatewayWs {
  const wsUrl = GATEWAY_URL.replace(/^http/, 'ws') + `/ws/${sessionId}`;
  const ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';

  ws.addEventListener('open', () => onOpen?.());
  ws.addEventListener('close', (ev) => {
    if (ev.code !== 1000 && ev.code !== 1005) {
      onEvent({ type: 'error', message: `WS close ${ev.code}: ${ev.reason || '(sense motiu)'}` });
    }
    onClose?.();
  });
  ws.addEventListener('message', (ev) => {
    if (typeof ev.data !== 'string') return; // no binary from server
    try {
      onEvent(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  });
  ws.addEventListener('error', () => onEvent({ type: 'error', message: 'WS error (mira consola del navegador)' }));

  return {
    send: (buf) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(buf);
    },
    sendText: (text) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'text', text }));
    },
    sendAudioStreamEnd: () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'audio_stream_end' }));
    },
    close: () => ws.close(),
  };
}
