import type { DocType, Region } from '../schemas/loader';

// System prompt per a la conversa de veu. Basat en el prompt validat el
// 2026-08-01 al Real-time playground d'AI Studio (AI_STUDIO_TEST_ELEC1.md).
// Reforçat perquè Gemini cridi sempre la funció abans de respondre en veu.

interface PromptSpec {
  fnName: string;
  fnDescription: string;
  systemInstruction: string;
  opening: string;
}

const CATALUNYA_PROMPTS: Record<DocType, PromptSpec> = {
  elec1: {
    fnName: 'save_elec1_fields',
    fnDescription:
      "Guarda o actualitza els camps del certificat ELEC1 amb el que l'instal·lador ha dit. Cada crida ha de contenir només els camps nous o modificats des de l'última crida.",
    opening:
      "Comencem l'ELEC1. Digues-me el nom del titular i el DNI quan vulguis.",
    systemInstruction: baseInstructions('ELEC1 de baixa tensió', [
      'titular (nom, NIF)',
      'CUPS',
      'potència contractada',
      'adreça completa',
    ]),
  },
  dr: {
    fnName: 'save_dr_fields',
    fnDescription:
      "Guarda o actualitza els camps de la Declaració Responsable. Cada crida ha de contenir només els camps nous o modificats.",
    opening:
      'Comencem la Declaració Responsable. Digues-me el titular i el declarant.',
    systemInstruction: baseInstructions('Declaració Responsable', [
      'titular',
      'declarant',
      'CUPS',
      'adreça',
    ]),
  },
  contracte: {
    fnName: 'save_contracte_fields',
    fnDescription:
      "Guarda o actualitza els camps del Contracte de Manteniment BT. Cada crida ha de contenir només els camps nous o modificats.",
    opening:
      "Comencem el Contracte de Manteniment. Digues-me el titular i l'adreça de la instal·lació.",
    systemInstruction: baseInstructions('Contracte de Manteniment BT', [
      'titular',
      'potència contractada',
      'expedient',
      'adreça',
    ]),
  },
  elec2: {
    fnName: 'save_elec2_fields',
    fnDescription:
      "Guarda o actualitza els camps de l'esquema unifilar ELEC2 (dades generals i circuits). Cada crida ha de contenir només els camps nous o modificats.",
    opening:
      "Comencem l'ELEC2. Digues-me les dades generals i després anirem circuit per circuit.",
    systemInstruction: baseInstructions('Esquema Unifilar ELEC2', [
      'titular',
      'potència contractada',
      'emplaçament',
    ]),
  },
  dictamen: {
    fnName: 'save_dictamen_fields',
    fnDescription:
      "Guarda o actualitza els camps del Dictamen de Reconeixement (dades generals + 43 punts d'inspecció). Cada crida ha de contenir només els camps nous o modificats.",
    opening:
      "Comencem el Dictamen. Digues-me les dades generals i després recorrem els 43 punts d'inspecció.",
    systemInstruction: baseInstructions('Dictamen de Reconeixement', [
      'titular',
      'expedient',
      'data de revisió',
    ]),
  },
};

function baseInstructions(docName: string, critical: string[]): string {
  const criticalList = critical.map((c) => `- ${c}`).join('\n');
  return `Ets l'assistent de veu de Sentinel per omplir el certificat ${docName} a Catalunya.
L'instal·lador et parlarà en català (pot barrejar castellà) mentre inspecciona una obra. Sovint tindrà soroll de fons.

REGLA ABSOLUTA I OBLIGATÒRIA:
- Cada vegada que l'instal·lador digui QUALSEVOL dada nova o corregeixi una anterior, has de cridar la funció ABANS de respondre en veu. Sense excepcions.
- Si no crides la funció, la teva resposta parlada és inútil per al sistema.
- Retorna només els camps nous o modificats des de l'última crida.

CAMPS CRÍTICS (confirma verbalment repetint el valor + "correcte?"):
${criticalList}
Per als camps no crítics, respon curt: "anotat" o "continua".

Regla d'unitats:
- Si l'usuari diu W o VA, converteix a kW abans de cridar la funció (per exemple 5750 W → 5.75).

Regla d'abreviatures:
- "C/" → "Carrer", "Ctra." → "Carretera", "Av." → "Avinguda".

Per als camps crítics, omple també _confidence amb "alta" | "mitjana" | "baixa" segons com de segur estiguis del que has entès.`;
}

export function getPromptSpec(region: Region, docType: DocType): PromptSpec {
  // De moment només Catalunya. Aragó/València/Madrid quan es defineixin els schemes.
  if (region !== 'catalunya') {
    throw new Error(`Prompt no disponible per a region='${region}'`);
  }
  const spec = CATALUNYA_PROMPTS[docType];
  if (!spec) throw new Error(`Prompt no definit per a docType='${docType}'`);
  return spec;
}
