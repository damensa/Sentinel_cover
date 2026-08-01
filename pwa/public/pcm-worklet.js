// AudioWorklet que converteix cada bloc d'àudio (Float32, mono) a PCM Int16.
// Es carrega dinàmicament amb audioContext.audioWorklet.addModule('/pcm-worklet.js').

class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) return true;
    const channel = input[0]; // Float32Array
    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      let s = channel[i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
