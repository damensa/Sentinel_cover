import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { openGatewayWs, type GatewayEvent, type GatewayWs } from '../api/gateway';
import { createRecorder, type Recorder } from '../audio/recorder';
import { createAudioPlayer, type AudioPlayer } from '../audio/player';

interface Bubble {
  who: 'user' | 'model';
  text: string;
}

const CRITICAL_KEYS = new Set([
  'nom_complet', 'nif', 'cups', 'potencia_kw',
  'nom_via', 'num_via', 'poblacio', 'codi_postal',
]);

export function ConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [fields, setFields] = useState<Record<string, any>>({});
  const [transcript, setTranscript] = useState<Bubble[]>([]);
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<GatewayWs | null>(null);
  const recRef = useRef<Recorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const player = createAudioPlayer();
    playerRef.current = player;

    const ws = openGatewayWs(
      sessionId,
      (evt) => { if (!cancelled) handleEvent(evt, player); },
      () => { if (!cancelled) setConnected(true); },
      () => { if (!cancelled) setConnected(false); },
    );
    wsRef.current = ws;

    createRecorder((pcm) => ws.send(pcm))
      .then((r) => {
        if (cancelled) { void r.destroy(); return; }
        recRef.current = r;
      })
      .catch((e) => {
        if (!cancelled) setError(`No s'ha pogut activar el micròfon: ${e.message}`);
      });

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
      void recRef.current?.destroy();
      recRef.current = null;
      void player.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function handleEvent(evt: GatewayEvent, player: AudioPlayer) {
    switch (evt.type) {
      case 'field_update':
        setFields(evt.fields ?? {});
        break;
      case 'user_transcript':
        appendChunk('user', evt.text);
        break;
      case 'model_text':
        appendChunk('model', evt.text);
        break;
      case 'model_audio':
        player.push(evt.data);
        break;
      case 'turn_complete':
        // El pròxim tros de text obre una bombolla nova.
        setTranscript((t) => (t.length && t[t.length - 1].text ? [...t, { who: 'model', text: '' }] : t));
        break;
      case 'error':
        setError(evt.message);
        if (evt.message.startsWith('WS close 1006')) {
          setTimeout(() => nav('/', { replace: true }), 1500);
        }
        break;
    }
  }

  // Les transcripcions arriben en trossos; els anem concatenant a la darrera
  // bombolla del mateix interlocutor en comptes de crear-ne una per tros.
  function appendChunk(who: 'user' | 'model', text: string) {
    setTranscript((t) => {
      const last = t[t.length - 1];
      if (last && last.who === who) {
        return [...t.slice(0, -1), { who, text: (last.text + text).trimStart() }];
      }
      return [...t.filter((b) => b.text), { who, text: text.trimStart() }];
    });
  }

  async function pttDown() {
    if (!recRef.current || recording) return;
    playerRef.current?.stop(); // interromp Gemini si encara parla
    await recRef.current.start();
    setRecording(true);
  }

  function pttUp() {
    if (!recRef.current || !recording) return;
    recRef.current.stop();
    setRecording(false);
    wsRef.current?.sendAudioStreamEnd();
  }

  function sendManual() {
    const t = manualText.trim();
    if (!t || !wsRef.current) return;
    appendChunk('user', t);
    wsRef.current.sendText(t);
    setManualText('');
  }

  return (
    <div className="page">
      <h1>Conversa <small>parla amb Sentinel</small></h1>
      <div className="status-bar">
        <span className={`status-dot ${connected ? 'live' : error ? 'err' : ''}`} />
        <span>{connected ? 'Sessió activa' : error ? 'Desconnectat' : 'Connectant…'}</span>
        <span style={{ marginLeft: 'auto' }}>
          <button className="btn secondary" onClick={() => nav(`/review/${sessionId}`, { state: { fields } })}>
            Revisa →
          </button>
        </span>
      </div>

      <div className="card">
        <label>Conversa</label>
        <div className="transcript">
          {transcript.filter((b) => b.text).length === 0 && (
            <p className="page-sub">Prem "Parla", digues la dada, i deixa anar.</p>
          )}
          {transcript.filter((b) => b.text).map((b, i) => (
            <div key={i} className={`bubble ${b.who}`}>
              <span className="who">{b.who === 'user' ? 'Tu' : 'Sentinel'}</span>
              {b.text}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <label>Camps</label>
        <FieldsPanel fields={fields} />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="card">
        <label>O escriu (fallback si el mic no capta bé)</label>
        <div className="row">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendManual(); }}
            placeholder="p.ex. El titular és Joan Garcia Puig amb DNI 46789012M"
          />
          <button className="btn" onClick={sendManual} disabled={!connected || !manualText.trim()}>
            Envia
          </button>
        </div>
      </div>

      <div className="ptt-wrap">
        <button
          className={`ptt ${recording ? 'recording' : ''}`}
          onPointerDown={pttDown}
          onPointerUp={pttUp}
          onPointerCancel={pttUp}
          onPointerLeave={pttUp}
          disabled={!connected}
        >
          {recording ? 'ESCOLTANT…' : 'PARLA'}
        </button>
      </div>
    </div>
  );
}

function FieldsPanel({ fields }: { fields: Record<string, any> }) {
  const confidence = fields._confidence ?? {};
  const rows = flattenFields(fields);
  if (rows.length === 0) {
    return <p className="page-sub">Encara no hi ha camps omplerts.</p>;
  }
  return (
    <div>
      {rows.map(({ key, value }) => {
        const shortKey = key.split('.').pop() ?? key;
        const conf = CRITICAL_KEYS.has(shortKey) ? (confidence[shortKey] ?? 'baixa') : null;
        return (
          <div className="field-row" key={key}>
            <span className="field-key">{key}</span>
            <span className="field-val">
              {formatValue(value)}
              {conf && <span className={`chip ${conf}`}>{conf}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function flattenFields(obj: any, prefix = ''): Array<{ key: string; value: any }> {
  const rows: Array<{ key: string; value: any }> = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k.startsWith('_')) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenFields(v, key));
    } else {
      rows.push({ key, value: v });
    }
  }
  return rows;
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}
