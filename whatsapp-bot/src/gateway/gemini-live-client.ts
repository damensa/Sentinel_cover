import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { schemaLoader, type DocType, type Region } from '../schemas/loader';
import { getPromptSpec } from './prompts';

// Model per a la conversa de veu. Es pot sobreescriure amb GEMINI_LIVE_MODEL.
// Validat que aquest ID connecta via @google/genai 2.15 i que emet
// function calls fiablement quan l'input és TEXT.
const DEFAULT_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview';

// Els models Live només accepten AUDIO com a response modality; TEXT hi
// fa timeout al connect. Per això la PWA transcriu la veu al navegador
// (Speech Recognition) i envia TEXT via sendText — el camí que dispara
// els function calls de manera fiable.
const RESPONSE_MODALITY = Modality.AUDIO;

export interface FunctionCallEvent {
  name: string;
  args: unknown;
  callId?: string;
}

export interface GeminiLiveHandlers {
  onFunctionCall: (evt: FunctionCallEvent) => void;
  onModelText: (text: string) => void;
  onModelAudio: (base64Pcm24k: string) => void;
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
    console.log(`[gemini-client] connecting model=${DEFAULT_MODEL} modality=${RESPONSE_MODALITY} doc=${region}/${docType}`);

    const connectPromise = this.ai.live.connect({
      model: DEFAULT_MODEL,
      config: {
        responseModalities: [RESPONSE_MODALITY],
        systemInstruction: spec.systemInstruction,
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
        // Transcripció de l'àudio d'entrada. Permet diagnosticar què entén
        // realment Gemini del que diu l'instal·lador.
        inputAudioTranscription: {},
      } as any,
      callbacks: {
        // onopen es dispara ABANS que `await connect()` assigni `this.session`,
        // per això no fem servir la callback per enviar res.
        onmessage: (msg: LiveServerMessage) => {
          if (process.env.GATEWAY_DEBUG_GEMINI === '1') {
            const kinds: string[] = [];
            const m = msg as any;
            if (m.setupComplete) kinds.push('setupComplete');
            if (m.toolCall) kinds.push(`toolCall(${m.toolCall.functionCalls?.length ?? 0})`);
            if (m.toolCallCancellation) kinds.push('toolCallCancellation');
            if (m.serverContent) {
              const sc = m.serverContent;
              const parts: string[] = [];
              if (sc.modelTurn?.parts) {
                for (const p of sc.modelTurn.parts) {
                  if (p.text) parts.push(`text(${p.text.length})`);
                  if (p.inlineData) parts.push(`inline(${p.inlineData.mimeType})`);
                  if (p.functionCall) parts.push('functionCall(inline!)');
                }
              }
              kinds.push(`serverContent{${parts.join(',')}${sc.turnComplete ? ',turnComplete' : ''}${sc.interrupted ? ',interrupted' : ''}}`);
            }
            console.log(`[gemini raw]`, kinds.join(' '));
          }
          this.dispatch(msg, handlers);
        },
        onerror: (err) => handlers.onError(err),
        onclose: () => handlers.onClose(),
      },
    });

    // Nota: no enviem opening automàticament. Amb half-cascade/native-audio,
    // enviar un turn "de l'usuari" abans que l'usuari parli pot contaminar
    // el context i afavorir la modalitat conversacional per sobre del
    // function calling. L'usuari inicia parlant.
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`connect timeout (10s) — el model ${DEFAULT_MODEL} no respon`)), 10000),
    );
    this.session = await Promise.race([connectPromise, timeout]);
    console.log(`[gemini-client] connected`);
    void spec;
  }

  private dispatch(msg: LiveServerMessage, h: GeminiLiveHandlers): void {
    const sc: any = (msg as any).serverContent;
    const tc: any = (msg as any).toolCall;

    if (tc?.functionCalls?.length) {
      for (const fc of tc.functionCalls) {
        h.onFunctionCall({ name: fc.name, args: fc.args, callId: fc.id });
      }
    }

    if (sc?.inputTranscription?.text) {
      // Reutilitzem onModelText per fer arribar la transcripció a la UI;
      // el gateway sap distingir-ho si vol.
      console.log(`[gemini transcription in] ${sc.inputTranscription.text}`);
    }

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
    this.session.sendClientContent({ turns: text });
  }

  // Envia la resposta al function_call perquè Gemini continuï.
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
