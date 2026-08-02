import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  type Session,
  type LiveServerMessage,
} from '@google/genai';
import { schemaLoader, type DocType, type Region } from '../schemas/loader';
import { getPromptSpec } from './prompts';

// Configuració replicada de la validació manual a Google AI Studio del
// 2026-08-01 (AI_STUDIO_TEST_ELEC1.md). Allà, amb aquest model, aquest
// prompt i thinkingLevel per sobre de MINIMAL, Gemini crida
// save_elec1_fields de manera fiable amb àudio d'entrada.
const DEFAULT_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview';

// A AI Studio, amb "Thinking level: Minimal" el model NO cridava mai la
// funció; en pujar-lo va començar a fer-ho. Aquest és el paràmetre clau.
const THINKING_LEVEL =
  (process.env.GEMINI_THINKING_LEVEL as ThinkingLevel) ?? ThinkingLevel.HIGH;

// Veu de sortida (a AI Studio es va provar amb Zephyr).
const VOICE_NAME = process.env.GEMINI_VOICE ?? 'Zephyr';

export interface FunctionCallEvent {
  name: string;
  args: unknown;
  callId?: string;
}

export interface GeminiLiveHandlers {
  onFunctionCall: (evt: FunctionCallEvent) => void;
  onModelText: (text: string) => void;
  onModelAudio: (base64Pcm24k: string) => void;
  onInputTranscript: (text: string) => void;
  onTurnComplete: () => void;
  onError: (err: unknown) => void;
  onClose: () => void;
}

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: Session | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(
    region: Region,
    docType: DocType,
    handlers: GeminiLiveHandlers,
  ): Promise<void> {
    const spec = getPromptSpec(region, docType);
    const parameters = schemaLoader.bundleForGemini(region, docType);
    console.log(
      `[gemini-client] connecting model=${DEFAULT_MODEL} thinking=${THINKING_LEVEL} doc=${region}/${docType}`,
    );

    const connectPromise = this.ai.live.connect({
      model: DEFAULT_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: spec.systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
        },
        // El paràmetre que va desbloquejar el function calling a AI Studio.
        thinkingConfig: { thinkingLevel: THINKING_LEVEL },
        tools: [
          {
            functionDeclarations: [
              {
                name: spec.fnName,
                description: spec.fnDescription,
                parameters,
              },
            ],
          },
        ],
        // Transcripcions: l'entrada per veure què entén de l'instal·lador,
        // la sortida per mostrar a la UI el que diu en veu.
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        // onopen es dispara ABANS que `await connect()` assigni `this.session`,
        // per això no fem servir la callback per enviar res.
        onmessage: (msg: LiveServerMessage) => {
          if (process.env.GATEWAY_DEBUG_GEMINI === '1') logRaw(msg);
          this.dispatch(msg, handlers);
        },
        onerror: (err) => handlers.onError(err),
        onclose: () => handlers.onClose(),
      },
    });

    const timeout = new Promise<never>((_, rej) =>
      setTimeout(
        () => rej(new Error(`connect timeout (15s) — el model ${DEFAULT_MODEL} no respon`)),
        15000,
      ),
    );
    this.session = await Promise.race([connectPromise, timeout]);
    console.log('[gemini-client] connected');

    // El system prompt demana a Gemini que obri ell la conversa. Li donem
    // el tret de sortida (igual que fa el playground d'AI Studio).
    this.session.sendClientContent({ turns: spec.opening, turnComplete: true });
  }

  private dispatch(msg: LiveServerMessage, h: GeminiLiveHandlers): void {
    const sc: any = (msg as any).serverContent;
    const tc: any = (msg as any).toolCall;

    if (tc?.functionCalls?.length) {
      for (const fc of tc.functionCalls) {
        h.onFunctionCall({ name: fc.name, args: fc.args, callId: fc.id });
      }
    }

    if (sc?.inputTranscription?.text) h.onInputTranscript(sc.inputTranscription.text);
    if (sc?.outputTranscription?.text) h.onModelText(sc.outputTranscription.text);

    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.text) h.onModelText(part.text);
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
          h.onModelAudio(part.inlineData.data);
        }
        // Alguns models emeten function_call inline dins modelTurn.parts en
        // comptes de al top-level toolCall. Ho tractem igual.
        if (part.functionCall) {
          h.onFunctionCall({
            name: part.functionCall.name ?? '',
            args: part.functionCall.args,
            callId: (part.functionCall as any).id,
          });
        }
      }
    }

    if (sc?.turnComplete) h.onTurnComplete();
  }

  sendAudio(base64Pcm16k: string): void {
    if (!this.session) throw new Error('Session not connected');
    this.session.sendRealtimeInput({
      audio: { data: base64Pcm16k, mimeType: 'audio/pcm;rate=16000' },
    });
  }

  sendAudioStreamEnd(): void {
    if (!this.session) throw new Error('Session not connected');
    this.session.sendRealtimeInput({ audioStreamEnd: true });
  }

  sendText(text: string): void {
    if (!this.session) throw new Error('Session not connected');
    this.session.sendClientContent({ turns: text, turnComplete: true });
  }

  // Envia la resposta al function_call perquè Gemini continuï. Equivalent al
  // toggle "Automatic Function Response" del playground d'AI Studio.
  sendFunctionResponse(callId: string | undefined, name: string, response: unknown): void {
    if (!this.session) throw new Error('Session not connected');
    this.session.sendToolResponse({
      functionResponses: [{ id: callId, name, response: response as any }],
    });
  }

  close(): void {
    this.session?.close();
    this.session = null;
  }
}

function logRaw(msg: LiveServerMessage): void {
  const kinds: string[] = [];
  const m = msg as any;
  if (m.setupComplete) kinds.push('setupComplete');
  if (m.toolCall) kinds.push(`toolCall(${m.toolCall.functionCalls?.length ?? 0})`);
  if (m.toolCallCancellation) kinds.push('toolCallCancellation');
  if (m.serverContent) {
    const sc = m.serverContent;
    const parts: string[] = [];
    if (sc.inputTranscription?.text) parts.push('inTranscript');
    if (sc.outputTranscription?.text) parts.push('outTranscript');
    if (sc.modelTurn?.parts) {
      for (const p of sc.modelTurn.parts) {
        if (p.text) parts.push(`text(${p.text.length})`);
        if (p.inlineData) parts.push('audio');
        if (p.functionCall) parts.push('functionCall(inline!)');
      }
    }
    kinds.push(
      `serverContent{${parts.join(',')}${sc.turnComplete ? ',turnComplete' : ''}${sc.interrupted ? ',interrupted' : ''}}`,
    );
  }
  if (kinds.length) console.log('[gemini raw]', kinds.join(' '));
}
