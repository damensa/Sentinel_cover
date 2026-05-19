import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { Elec1FormData } from './form-filler';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class DataExtractorService {
    async extractElec1Data(text: string, currentData: Partial<Elec1FormData> = {}): Promise<Partial<Elec1FormData>> {
        console.log('[AI Extractor] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a certificats elèctrics (ELEC1).
            La teva feina és extreure dades del text de l'usuari i retornar un JSON net.

            Esquema del JSON a retornar:
            {
              "titular": { "nomCognoms": string, "nif": string, "tel": string, "correu": string },
              "adreca": { "tipusVia": "Carrer, Avinguda, Baixada, Camí, etc.", "nomVia": string, "numero": string, "bloc": string, "escala": string, "pis": string, "porta": string, "codiPostal": string, "poblacio": string, "tel": string, "correu": string },
              "caracteristiques": { 
                "potenciaMax": string, 
                "tensio": "230 V" | "3x230/400 V" | "Altra",
                "circuits": string,
                "iga": string,
                "resistenciaAillament": string,
                "resistenciaTerra": string,
                "aillamentTerra": string,
                "calibreCGP": string,
                "igm": string,
                "lga": string,
                "observacions": string,
                "cups": string,
                "tipusActuacio": "Nova" | "Ampliació" | "Modificació",
                "requisits": "P1" | "P2" | "MTD",
                "us": string,
                "materialConductor": "Coure" | "Alumini",
                "ubicacioComptadors": "Sala" | "Armari" | "Altra",
                "tipusConnexio": "Assistida" | "Interconnectada",
                "subministramentComplementari": "Sí" | "No"
              }
            }

            IMPORTANT:
            - CUPS: Sol començar per "ES" seguit de molts números.
            - Tipus d'actuació: "Nova", "Ampliació" o "Reforma/Modificació".
            - Requisits: "P1", "P2" o "Memòria tècnica/MTD".
            - Ús: Només si es menciona l'ús (ex: "habitatge", "local comercial", "garatge", "industrial").
            - Reconeix termes tècnics: IGA, IGM, LGA, CGP, Aïllament, Terra.
            - Qualsevol text addicional que sembli una nota, posa-lo a "observacions".
            - Si una dada no hi és, no la incloguis o deixa-la null.
            - Dades actuals per context: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor] Error:', error);
            return {};
        }
    }

    async extractDRData(text: string, currentData: any = {}): Promise<any> {
        console.log('[AI Extractor DR] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a la "Declaració Responsable d'Instal·lació".
            Extrau les dades del text de l'usuari i retorna un JSON net.

            Esquema del JSON a retornar:
            {
              "titular": { "nom": string, "nif": string },
              "installacio": { 
                "tipus": string, // ex: "Baixa Tensió", "Grua", "Químics", "Pressió"
                "campReglamentari": string,
                "cups": string 
              },
              "adreca": { "tipusVia": "Carrer, Avinguda, Baixada, Camí, etc.", "nomVia": string, "numero": string, "poblacio": string, "codiPostal": string, "municipi": string, "comarca": string },
              "declarant": { "nom": string, "nif": string, "tipusPersona": "TIT" | "REP" }
            }

            IMPORTANT:
            - Tipus d'instal·lació: Intenta identificar el reglament o tipus (ex: PESS de grua, BT per baixa tensió, etc.).
            - Si l'usuari diu "soc el titular", tipusPersona és "TIT". Si és un representant, "REP".
            - No inventis dades, si no hi són, deixa-les null.
            - Dades actuals: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor DR] Error:', error);
            return {};
        }
    }

    async extractContractData(text: string, currentData: any = {}): Promise<any> {
        console.log('[AI Extractor Contract] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a un "Contracte de manteniment de baixa tensió".
            Extrau les dades del text de l'usuari i retorna un JSON net.

            Esquema del JSON a retornar:
            {
              "titular": { "nom": string, "nif": string, "correu": string, "adreca": string, "poblacio": string, "codiPostal": string, "tel": string },
              "representant": { "nom": string, "dni": string },
              "installacio": {
                "adreca": string,
                "poblacio": string,
                "us": string,
                "potenciaMax": string,
                "superficie": string,
                "potenciaInstallada": string,
                "tensio": string,
                "potenciaContractada": string,
                "numExpedientBT": string,
                "empresaComercialitzadora": string,
                "aportaDoc": "Sí" | "No",
                "altresDades": string
              },
              "data": { "dia": string, "mes": string, "any": string, "ciutat": string }
            }

            IMPORTANT:
            - Aporta Documentació: acostuma a ser "Sí" o "No".
            - Si l'adreca de la instal·lació és la mateixa que la del titular, deixa-la buida o utilitza la mateixa a l'objecte "installacio".
            - Si l'usuari no especifica la data, deixa els camps null o utilitza la data actual si sembla pertinent.
            - L'any sol ser "26" o "2026".
            - No inventis dades, si no hi són, deixa-les null.
            - Dades actuals per mantenir el context: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor Contract] Error:', error);
            return {};
        }
    }

    async extractElec2Data(text: string, currentData: any = {}): Promise<any> {
        console.log('[AI Extractor ELEC2] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a un "Esquema Unifilar ELEC-2".
            Extrau les dades del text de l'usuari i retorna un JSON net.

            Esquema del JSON a retornar:
            {
              "general": { 
                "empresa": string, 
                "tensio": string, 
                "seccioConexio": string, 
                "iga": string, 
                "potenciaContractada": string,
                "emplaçament": string,
                "titular": string
              },
              "circuit": {
                "receptor": string,
                "potencia": string,
                "seccio": string,
                "pia": string,
                "diferencial": string
              }
            }

            IMPORTANT:
            - Si l'usuari descriu dades de l'escomesa o titular, posa-les a "general".
            - Si l'usuari descriu dades d'un circuit individual, posa-les a "circuit".
            - No inventis dades, si no hi són, deixa-les null.
            - Dades actuals per a context: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor ELEC2] Error:', error);
            return {};
        }
    }

    async extractElec3Data(text: string, currentData: any = {}): Promise<any> {
        console.log('[AI Extractor ELEC3] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a una "Memòria Tècnica ELEC-3".
            Extrau les dades del text de l'usuari i retorna un JSON net.

            Esquema del JSON a retornar:
            {
              "general": {
                "titular": string,
                "us": string,
                "emplaçament": string,
                "carrer": string,
                "num": string,
                "pis": string,
                "porta": string,
                "localitat": string,
                "cp": string,
                "tipusActuacio": "NOVA" | "AMPLIACIO" | "REFORMA",
                "empresaDistribuidora": string,
                "seccioDerivacioIndiv": string,
                "iga": string,
                "caractEdifici": string,
                "superficie": string,
                "tensio": string,
                "potenciaMax": string,
                "potenciaInstalar": string,
                "resistTierra": string
              },
              "circuit": {
                "id": string,
                "carrega": string,
                "potencia": string,
                "cosFi": string,
                "intensitat": string,
                "seccioFase": string,
                "longitud": string,
                "momentElec": string,
                "caigudaParcial": string,
                "caigudaTotal": string,
                "tipusAillament": string,
                "tensioNominal": string,
                "diametreTub": string,
                "tubSistema": string,
                "encastat": "X" | " ",
                "noEncastat": "X" | " ",
                "profunditat": string,
                "aillamentInstal": string,
                "seccioNeutre": string,
                "seccioProteccion": string
              },
              "diferencial": {
                "circuit": string,
                "nombre": string,
                "in": string,
                "sensibilitat": string
              }
            }

            IMPORTANT:
            - "tipusActuacio" normalment és Nova, Ampliació o Reforma.
            - UNITATS: No incloguis unitats (kW, V, A, mm2, m, ohms) en els valors. Retorna NOMÉS el número. 
              Exemple: En lloc de "10 kW", retorna "10". En lloc de "16 mm2", retorna "16".
            - L'usuari ens donarà dades generals lligades a "general", detalls d'un circuit en concret lligats a "circuit", o detalls d'un diferencial a "diferencial".
            - No inventis dades, si no hi són deixa null.
            - "encastat" o "noEncastat" han de portar el valor "X" depenent de si el tub va sota paret (encastat=X, noEncastat=" ") o per fora (encastat=" ", noEncastat=X).
            - Dades actuals per context: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor ELEC3] Error:', error);
            return {};
        }
    }

    async extractDictamenData(text: string, currentData: any = {}): Promise<any> {
        console.log('[AI Extractor DICTAMEN] Analyzing text:', text);

        const systemPrompt = `
            Ets un assistent especialitzat en l'extracció de dades per a un "Dictamen de Reconeixement d'Instal·lacions".
            Aquest document té unes "Dades Generals" i una taula d'inspecció de 43 punts on s'ha de marcar "Correcte" o "Incorrecte".
            L'usuari ens pot donar Dades Generals O ens pot dir "Això està malament" referint-se a un punt de la taula.
            
            Retorna NOMÉS el que l'usuari aporti en aquest torn, en format JSON:
            {
              "general": {
                "titular": string,
                "emplaçament": string,
                "localitat": string,
                "cp": string,
                "dataRevisio": string,
                "activitat": string,
                "expedient": string,
                "empresaDistribuidora": string,
                "potenciaMax": string,
                "potenciaContractada": string,
                "potenciaMaxComp": string,
                "potenciaContractadaComp": string,
                "tensio": string
              },
              "anomalies": [
                {
                  "id": number,
                  "observacio": string
                }
              ]
            }

            ID DELS PUNTS D'INSPECCIÓ (Per a les "anomalies"):
            1. Cablatge i connexions (CGP)
            2. Caixa, porta i pany (CGP)
            3. Conductors i aïllaments (Derivació individual)
            4. Tubs, canalitzacions i fixacions (Derivació individual)
            5. Connexions (Derivació individual)
            6. Caixes i tapes de mòduls (Quadre comandament)
            7. Fusibles (Quadre comandament)
            8. Interruptors i disjuntors (Quadre comandament)
            9. Contactors i relés (Quadre comandament)
            10. ICPM i la seva verificació oficial
            11. IGA
            12. Diferencials i les seves sensibilitats
            13. Estat i calibrat dels PIA
            14. Equips de mesura i precintes
            15. Cablatge interior i precintes
            16. Mesura de la resistència a terra
            17. Quadres i subquadres (R. Terra)
            18. Endolls (R. Terra)
            19. Aparells d'il·luminació (R. Terra)
            20. Xarxa equipotencial
            21. Ascensors (Verificació terra)
            22. Estats i colors dels cables
            23. Tubs, canalitzacions i fixacions (Inst. Interiors)
            24. Caixes derivació i connexions
            25. Conductors, aïllament colors
            26. Endolls
            27. Estat dels aparells i fixacions (Inst. Interiors)
            28. Funcionament (Inst. Interiors)
            29. Connexions (Inst. Interiors)
            30. Estat dels aparells i fixacions (Emergència)
            31. Funcionament (Emergència)
            32. Connexions (Emergència)
            33. Caixes i tapes (Subquadres)
            34. Diferencials i sensibilitats (Subquadres)
            35. Estat i calibrat dels PIA (Subquadres)
            36. Cablatge i connexions (Subquadres)
            37. Motors (Receptors)
            38. Aparells d'aire condicionat (Receptors)
            39. Maquinària d'oficines (Receptors)
            40. Ascensors (Receptors)
            41. Resistència terres (Parallamps)
            42. Descarregues registrades (Parallamps)

            IMPORTANT:
            - Si l'usuari diu "Els ascensors estan trencats i els cables pelats", retorna id 21 (o 41) i id 22 com a anomalies.
            - "general" i "anomalies" són opcionals. Si el text no parla de cap, deixa'ls buits (omet-los o array buit).
            - Dades actuals de la sessió per context: ${JSON.stringify(currentData)}
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
            if (!content) return {};

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Extractor DICTAMEN] Error:', error);
            return {};
        }
    }
}

export const dataExtractor = new DataExtractorService();
