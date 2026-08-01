// Captura del micròfon i emissió de chunks PCM 16-bit a 16kHz mono (el
// format que Gemini Live espera).

const TARGET_RATE = 16000;

export interface Recorder {
  start: () => Promise<void>;
  stop: () => void;
  isActive: () => boolean;
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

  // AudioContext a 16kHz. La majoria de navegadors moderns respecten aquest
  // sampleRate; si el hardware no ho suporta, el navegador el negocia i
  // toca resamplejar. De moment ho deixem senzill i confiem en 16kHz nadiu.
  const ctx = new AudioContext({ sampleRate: TARGET_RATE });
  await ctx.audioWorklet.addModule('/pcm-worklet.js');
  const source = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, 'pcm-processor');

  let active = false;

  worklet.port.onmessage = (evt) => {
    if (!active) return;
    onChunk(evt.data as ArrayBuffer);
  };

  source.connect(worklet);
  // No connectem el worklet a ctx.destination (evita eco).

  // El ctx pot començar en estat 'suspended' en algun navegador.
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  return {
    start: async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      active = true;
    },
    stop: () => {
      active = false;
    },
    isActive: () => active,
    destroy: async () => {
      active = false;
      worklet.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}

export function getSampleRateInfo(): string {
  return `objectiu ${TARGET_RATE} Hz`;
}
