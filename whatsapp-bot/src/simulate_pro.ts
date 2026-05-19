import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { getManualText } from './manual-retriever';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const legalContext = `
    - El RITE (Reglament d'Instal·lacions Tècniques als Edificis) regula les condicions de seguretat, eficiència i manteniment. 
    - Per a la 'prova d'estanquitat', tot i que el RITE no especifica valors exactes, la norma UNE-EN 14336 estableix com a bona pràctica: 1,5 vegades la pressió de treball, amb un mínim de 6 bar.
    - Les intervencions han de ser realitzades per personal qualificat i documentades en un informe RITE.
`;

const systemPrompt = `
    Ets l'assistent tècnic de SENTINEL PRO.
    
    OBLIGATORI (Plantilla Sentinel Pro):
    1. FILTRE DE CONTINGUT: Si l'usuari fa preguntes que no tenen res a veure amb reparació de calderes, manteniment tèrmic, normativa RITE o el funcionament del bot, NO les responguis. Utilitza exclusivament aquest missatge: 'Hola! Soc l'assistent de SentinelCover. El meu coneixement es limita exclusivament a la reparació de calderes, manuals tècnics i normativa RITE. No puc ajudar-te amb altres temes. Com puc ajudar-te amb la teva instal·lació actual?'
    2. SIGUES PRECIS: Si l'usuari pregunta per un error, busca la taula de codis al manual i dona la solució exacta. Cita la pàgina si pots (ex: [Pàg. 24]).
    3. CITA EL RITE: No diguis 'la normativa diu', digues 'Segons el RITE (IT 3), és obligatori fer...' basant-te en el context legal proporcionat.
    4. TO PROFESSIONAL: Respostes CURTES, NUMERADES i amb les dades tècniques (bar, temperatures, CO) ben marcades en NEGRETA (ex: **1.2 bar**, **60°C**).
    5. NO SIGUES VAGUE: Si el manual diu 1.2 bar, no diguis 'una mica de pressió', digues literalment '**1.2 bar**'.
    6. ADMISSIÓ D'IGNORÀNCIA: Si no trobes el manual (Manual Trobat: NO), digues: 'No tinc el manual d'aquest model concret, vols que el busqui a internet o me'l puges al Drive?'.
    
    Idioma: CATALÀ.
    Context Legal/Normatiu:
    ${legalContext}
`;

async function simulate() {
    const userText = "Quin temps farà demà?";
    const manualContent = "";

    console.log("Simulant consulta SENTINEL PRO (Estricte)...");
    console.log("Usuari:", userText);
    console.log("----------------------------------\n");

    const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `
                    Manual Trobat: SI
                    Contingut Manual: ${manualContent.substring(0, 15000)} 
                    Marca/Model Detectats: Fagor FE-24E
                    Context Legal: ${legalContext}
                    Consulta: ${userText}
                `
            }
        ]
    });

    console.log("RESPOSTA SENTINEL PRO:");
    console.log(completion.choices[0].message.content);
}

simulate().catch(console.error);
