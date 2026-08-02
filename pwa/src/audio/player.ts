// Reproductor de l'àudio que retorna Gemini (PCM 16-bit signed, 24kHz, mono).
// Encadena els chunks en una cua perquè sonin seguits sense talls.

const OUTPUT_RATE = 24000;

export interface AudioPlayer {
  push: (base64Pcm24k: string) => void;
  stop: () => void;
  destroy: () => Promise<void>;
}

export function createAudioPlayer(): AudioPlayer {
  const ctx = new AudioContext({ sampleRate: OUTPUT_RATE });
  // Moment (en temps de l'AudioContext) on ha de començar el pròxim chunk.
  let nextStartAt = 0;
  let sources: AudioBufferSourceNode[] = [];

  function push(base64: string): void {
    const bytes = base64ToBytes(base64);
    if (bytes.byteLength < 2) return;

    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
    const buffer = ctx.createBuffer(1, pcm.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartAt < now) nextStartAt = now + 0.05; // petit coixí inicial
    src.start(nextStartAt);
    nextStartAt += buffer.duration;

    sources.push(src);
    src.onended = () => {
      sources = sources.filter((s) => s !== src);
    };

    if (ctx.state === 'suspended') void ctx.resume();
  }

  function stop(): void {
    for (const s of sources) {
      try { s.stop(); } catch { /* ja acabat */ }
    }
    sources = [];
    nextStartAt = 0;
  }

  return {
    push,
    stop,
    destroy: async () => {
      stop();
      await ctx.close();
    },
  };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
