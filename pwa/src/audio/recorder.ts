// Captura del micròfon i emissió de chunks PCM 16-bit a 16kHz mono (el
// format que Gemini Live espera).

const TARGET_RATE = 16000;
// Acumulem ~100ms d'àudio per WS frame (1600 mostres a 16kHz = 3200 bytes).
// Enviar chunks massa petits (128 mostres/frame de l'AudioWorklet) satura
// el WS i pot despistar la VAD de Gemini.
const CHUNK_SAMPLES = 1600;

export interface Recorder {
  start: () => Promise<void>;
  stop: () => void;
  isActive: () => boolean;
  sampleRate: () => number;
  destroy: () => Promise<void>;
}

export async function createRecorder(
  onChunk: (pcm16kMono: ArrayBuffer) => void,
): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const ctx = new AudioContext({ sampleRate: TARGET_RATE });
  await ctx.audioWorklet.addModule('/pcm-worklet.js');
  const source = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, 'pcm-processor');

  let active = false;
  let acc: Int16Array[] = [];
  let accSize = 0;

  function flushBuffer(): void {
    if (accSize === 0) return;
    const out = new Int16Array(accSize);
    let o = 0;
    for (const c of acc) {
      out.set(c, o);
      o += c.length;
    }
    onChunk(out.buffer);
    acc = [];
    accSize = 0;
  }

  let maxAmpSinceStart = 0;
  let chunksSinceStart = 0;

  worklet.port.onmessage = (evt) => {
    if (!active) return;
    const chunk = new Int16Array(evt.data as ArrayBuffer);
    // Level meter: pic màxim d'aquest sub-chunk (normalitzat a 0..1)
    for (let i = 0; i < chunk.length; i++) {
      const a = Math.abs(chunk[i]);
      if (a > maxAmpSinceStart) maxAmpSinceStart = a;
    }
    chunksSinceStart++;
    if (chunksSinceStart % 40 === 0) {
      console.log(`[recorder] pic normalitzat: ${(maxAmpSinceStart / 32768).toFixed(3)} (0=silenci, 1=màxim)`);
    }
    acc.push(chunk);
    accSize += chunk.length;
    if (accSize >= CHUNK_SAMPLES) flushBuffer();
  };

  source.connect(worklet);

  if (ctx.state === 'suspended') await ctx.resume();

  console.log(
    `[recorder] AudioContext sampleRate=${ctx.sampleRate} Hz (objectiu ${TARGET_RATE})`,
  );

  return {
    start: async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      active = true;
      acc = [];
      accSize = 0;
      maxAmpSinceStart = 0;
      chunksSinceStart = 0;
    },
    stop: () => {
      active = false;
      flushBuffer();
      console.log(`[recorder] torn acabat: pic màxim ${(maxAmpSinceStart / 32768).toFixed(3)}${maxAmpSinceStart < 500 ? ' ← MOLT BAIXA, el mic possiblement està en silenci' : ''}`);
    },
    isActive: () => active,
    sampleRate: () => ctx.sampleRate,
    destroy: async () => {
      active = false;
      worklet.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}
