import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ClassificationResult {
    intent: 'form_filling' | 'technical_query' | 'general_chat';
    formId: string | null;
    confidence: number;
}

export class ClassifierService {
    private certificates: any[];

    constructor() {
        const certsPath = path.join(__dirname, 'certificates.json');
        this.certificates = JSON.parse(fs.readFileSync(certsPath, 'utf8'));
    }

    async classifyIntent(text: string): Promise<ClassificationResult> {
        console.log('[Classifier] Analyzing text:', text);

        const systemPrompt = `
            Ets un classificador d'intencions per a un assistent tècnic de manteniment i certificats.
            La teva feina és determinar si l'usuari vol omplir un certificat o fer una consulta tècnica.

            Certificats disponibles:
            ${JSON.stringify(this.certificates, null, 2)}

            Intencions:
            - "form_filling": L'usuari vol començar o continuar omplint un certificat/formulari especificat al registre.
            - "technical_query": L'usuari fa una pregunta sobre una caldera, error, normativa o manteniment.
            - "general_chat": Salutacions o converses no tècniques.

            Retorna EXCLUSIVAMENT un objecte JSON amb aquest format:
            {
              "intent": "form_filling" | "technical_query" | "general_chat",
              "formId": string | null, // L'ID del certificat si l'intent és form_filling
              "confidence": number // Entre 0 i 1
            }
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            if (!content) return { intent: 'general_chat', formId: null, confidence: 0 };

            return JSON.parse(content);
        } catch (error) {
            console.error('[Classifier] Error:', error);
            return { intent: 'general_chat', formId: null, confidence: 0 };
        }
    }
}

export const classifierService = new ClassifierService();
