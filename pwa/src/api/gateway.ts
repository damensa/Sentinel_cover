export type Region = 'catalunya';
export type DocType = 'elec1' | 'dr' | 'contracte' | 'elec2' | 'dictamen';

// A dev, .env local apunta a http://localhost:3001. En producció (build sense
// VITE_GATEWAY_URL definit), el gateway serveix la PWA des del mateix origen.
const GATEWAY_URL =
  ((import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? '').trim() ||
  (typeof window !== 'undefined' ? window.location.origin : '');

// Token compartit per accedir al gateway quan està protegit. La PWA el llegeix
// de ?token=… la primera vegada i el desa a localStorage. Es propaga per
// header i com a query string a la WS.
const TOKEN_STORAGE_KEY = 'sentinel.gateway_token';

function persistTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const fromUrl = new URLSearchParams(window.location.search).get('token');
  if (fromUrl) {
    try { window.localStorage.setItem(TOKEN_STORAGE_KEY, fromUrl); } catch { /* ignore */ }
  }
}
persistTokenFromUrl();

export function getGatewayToken(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''; } catch { return ''; }
}

function authHeaders(): Record<string, string> {
  const t = getGatewayToken();
  return t ? { 'x-sentinel-token': t } : {};
}

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
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ region, docType }),
  });
  if (res.status === 403) {
    throw new Error("Enllaç invàlid o expirat. Demana el link amb ?token=… al teu contacte.");
  }
  if (!res.ok) throw new Error(`POST /session ${res.status}`);
  return res.json();
}

export interface GeneratedDocument {
  docType: DocType;
  filename: string;
  downloadUrl: string;
}

export interface SubmitResponse {
  ok: boolean;
  fields: any;
  errors?: any[];
  documents?: GeneratedDocument[];
  error?: string;
}

export async function submitSession(sessionId: string): Promise<SubmitResponse> {
  const res = await fetch(`${GATEWAY_URL}/session/${sessionId}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return res.json();
}

/** URL absoluta de descàrrega, amb el token com a query string perquè el
 *  gateway l'accepti sense capçaleres (els navegadors no en posen a les
 *  descàrregues directes des d'un <a href>). */
export function documentUrl(relativeUrl: string): string {
  const token = getGatewayToken();
  if (!token) return `${GATEWAY_URL}${relativeUrl}`;
  const sep = relativeUrl.includes('?') ? '&' : '?';
  return `${GATEWAY_URL}${relativeUrl}${sep}token=${encodeURIComponent(token)}`;
}

// Events que el gateway envia via WS. Coincideix amb el que emet server.ts.
export type GatewayEvent =
  | { type: 'field_update'; fields: Record<string, any>; delta: Record<string, any> }
  | { type: 'model_text'; text: string }
  | { type: 'user_transcript'; text: string }
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
  const token = getGatewayToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  const wsUrl = GATEWAY_URL.replace(/^http/, 'ws') + `/ws/${sessionId}${query}`;
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
