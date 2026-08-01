import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { schemaLoader, type DocType, type Region } from '../schemas/loader';
import { getPromptSpec } from './prompts';

// Model per a la conversa de veu. Es pot sobreescriure amb GEMINI_LIVE_MODEL.
// El validat al 2026-08-01 és 'gemini-3.1-flash-live-preview' (AI Studio).
const DEFAULT_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview';

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

    this.session = await this.ai.live.connect({
      model: DEFAULT_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
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
      },
      callbacks: {
        onopen: () => {
          // La primera cosa: enviem l'opening perquè el model comenci parlant.
          this.sendText(spec.opening);
        },
        onmessage: (msg: LiveServerMessage) => this.dispatch(msg, handlers),
        onerror: (err) => handlers.onError(err),
        onclose: () => handlers.onClose(),
      },
    });
  }

  private dispatch(msg: LiveServerMessage, h: GeminiLiveHandlers): void {
    const sc: any = (msg as any).serverContent;
    const tc: any = (msg as any).toolCall;

    if (tc?.functionCalls?.length) {
      for (const fc of tc.functionCalls) {
        h.onFunctionCall({ name: fc.name, args: fc.args, callId: fc.id });
      }
    }

    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.text) h.onModelText(part.text);
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
          h.onModelAudio(part.inlineData.data);
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
