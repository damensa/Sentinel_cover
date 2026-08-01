// Reconeixement de veu amb la Web Speech API del navegador (funciona a
// Chrome/Edge amb suport per català ca-ES). Substitueix el streaming
// d'àudio cru — Gemini Live no dispara function calls amb àudio d'entrada
// però sí amb text.

type SpeechListener = (transcript: string, isFinal: boolean) => void;

export interface SpeechRec {
  start: () => void;
  stop: () => void;
  isSupported: () => boolean;
  isActive: () => boolean;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function createSpeechRecognition(
  lang: string,
  onResult: SpeechListener,
  onError?: (msg: string) => void,
): SpeechRec {
  const w = window as WindowWithSpeech;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    return {
      start: () => onError?.('SpeechRecognition no disponible en aquest navegador'),
      stop: () => {},
      isSupported: () => false,
      isActive: () => false,
    };
  }

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;

  let active = false;
  let finalBuffer = '';

  rec.onresult = (ev: any) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      const text = r[0]?.transcript ?? '';
      if (r.isFinal) {
        finalBuffer += (finalBuffer ? ' ' : '') + text.trim();
      } else {
        interim += text;
      }
    }
    const partial = (finalBuffer + ' ' + interim).trim();
    if (partial) onResult(partial, false);
  };

  rec.onerror = (ev: any) => {
    const msg = String(ev?.error ?? 'unknown');
    if (msg === 'no-speech' || msg === 'aborted') return;
    onError?.(`speech-recognition: ${msg}`);
  };

  rec.onend = () => {
    active = false;
    if (finalBuffer) {
      onResult(finalBuffer, true);
      finalBuffer = '';
    }
  };

  return {
    start: () => {
      if (active) return;
      finalBuffer = '';
      try {
        rec.start();
        active = true;
      } catch (e) {
        onError?.(`start: ${(e as Error).message}`);
      }
    },
    stop: () => {
      if (!active) return;
      try { rec.stop(); } catch { /* ignore */ }
    },
    isSupported: () => true,
    isActive: () => active,
  };
}
