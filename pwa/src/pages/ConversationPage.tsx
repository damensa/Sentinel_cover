import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { openGatewayWs, type GatewayEvent, type GatewayWs } from '../api/gateway';
import { createSpeechRecognition, type SpeechRec } from '../audio/speech-recognition';

interface Bubble {
  who: 'user' | 'model';
  text: string;
  ts: number;
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
  const [interim, setInterim] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<GatewayWs | null>(null);
  const speechRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const ws = openGatewayWs(
      sessionId,
      (evt) => { if (!cancelled) handleEvent(evt); },
      () => { if (!cancelled) setConnected(true); },
      () => { if (!cancelled) setConnected(false); },
    );
    wsRef.current = ws;

    // Llengua per defecte català; es pot forçar amb ?lang=xx-XX per proves
    // (per exemple ?lang=en-US o ?lang=es-ES).
    const urlLang = new URLSearchParams(window.location.hash.split('?')[1] ?? window.location.search).get('lang');
    const rec = createSpeechRecognition(
      urlLang ?? 'ca-ES',
      (text, isFinal) => {
        if (cancelled) return;
        setInterim(text);
        if (isFinal && text) {
          setInterim('');
          setTranscript((t) => [...t, { who: 'user', text, ts: Date.now() }]);
          ws.sendText(text);
        }
      },
      (msg) => { if (!cancelled) setError(msg); },
    );
    speechRef.current = rec;
    if (!rec.isSupported()) {
      setError("El teu navegador no suporta Speech Recognition. Prova amb Chrome o Edge.");
    }

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
      rec.stop();
      speechRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function handleEvent(evt: GatewayEvent) {
    switch (evt.type) {
      case 'field_update':
        setFields(evt.fields ?? {});
        break;
      case 'model_text':
        setTranscript((t) => [...t, { who: 'model', text: evt.text, ts: Date.now() }]);
        speak(evt.text);
        break;
      case 'model_audio':
        // El model també respon amb àudio; per ara ho ignorem, TTS del navegador
        // s'encarrega de reproduir la resposta a partir del text (si arriba).
        break;
      case 'turn_complete':
        break;
      case 'error':
        setError(evt.message);
        if (evt.message.startsWith('WS close 1006')) {
          setTimeout(() => nav('/', { replace: true }), 1500);
        }
        break;
    }
  }

  function pttDown() {
    if (!speechRef.current || recording) return;
    setInterim('');
    speechRef.current.start();
    setRecording(true);
  }

  function pttUp() {
    if (!speechRef.current || !recording) return;
    speechRef.current.stop();
    setRecording(false);
  }

  function goReview() {
    nav(`/review/${sessionId}`, { state: { fields } });
  }

  return (
    <div className="page">
      <h1>Conversa <small>parla amb Sentinel</small></h1>
      <div className="status-bar">
        <span className={`status-dot ${connected ? 'live' : error ? 'err' : ''}`} />
        <span>{connected ? 'Sessió activa' : error ? 'Desconnectat' : 'Connectant…'}</span>
        <span style={{ marginLeft: 'auto' }}>
          <button className="btn secondary" onClick={goReview}>Revisa →</button>
        </span>
      </div>

      <div className="card">
        <label>Conversa</label>
        <div className="transcript">
          {transcript.length === 0 && !interim && (
            <p className="page-sub">Prem "Parla", digues la dada, i deixa anar.</p>
          )}
          {transcript.map((b, i) => (
            <div key={i} className={`bubble ${b.who}`}>
              <span className="who">{b.who === 'user' ? 'Tu' : 'Sentinel'}</span>
              {b.text}
            </div>
          ))}
          {interim && (
            <div className="bubble user" style={{ opacity: 0.6 }}>
              <span className="who">Tu (interpretant…)</span>
              {interim}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <label>Camps</label>
        <FieldsPanel fields={fields} />
      </div>

      {error && <p className="error-msg">{error}</p>}

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

function speak(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ca-ES';
    u.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
