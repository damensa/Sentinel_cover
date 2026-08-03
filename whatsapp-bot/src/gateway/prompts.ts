import type { DocType, Region } from '../schemas/loader';

// System prompts per a la conversa de veu.
//
// IMPORTANT: aquest text és el que es va validar manualment el 2026-08-01 al
// playground Real-time de Google AI Studio (veure AI_STUDIO_TEST_ELEC1.md).
// Amb aquest prompt, thinkingLevel per sobre de MINIMAL i Automatic Function
// Response activat, Gemini crida la funció de manera fiable amb àudio
// d'entrada. No el simplifiquis sense tornar a validar-lo.

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
    opening: "Comencem l'ELEC1. Digues-me el nom del titular i el DNI quan vulguis.",
    systemInstruction: baseInstructions(
      'ELEC1 de baixa tensió',
      'save_elec1_fields',
      'titular, NIF, CUPS, potència i adreça',
      "Comencem l'ELEC1. Digues-me el nom del titular i el DNI quan vulguis.",
    ),
  },
  dr: {
    fnName: 'save_dr_fields',
    fnDescription:
      'Guarda o actualitza els camps de la Declaració Responsable. Cada crida ha de contenir només els camps nous o modificats.',
    opening: 'Comencem la Declaració Responsable. Digues-me el titular i el declarant.',
    systemInstruction: baseInstructions(
      'Declaració Responsable',
      'save_dr_fields',
      'titular, declarant, CUPS i adreça',
      'Comencem la Declaració Responsable. Digues-me el titular i el declarant.',
    ),
  },
  contracte: {
    fnName: 'save_contracte_fields',
    fnDescription:
      'Guarda o actualitza els camps del Contracte de Manteniment BT. Cada crida ha de contenir només els camps nous o modificats.',
    opening: "Comencem el Contracte de Manteniment. Digues-me el titular i l'adreça de la instal·lació.",
    systemInstruction: baseInstructions(
      'Contracte de Manteniment BT',
      'save_contracte_fields',
      'titular, potència contractada, expedient i adreça',
      "Comencem el Contracte de Manteniment. Digues-me el titular i l'adreça de la instal·lació.",
    ),
  },
  elec2: {
    fnName: 'save_elec2_fields',
    fnDescription:
      "Guarda o actualitza els camps de l'esquema unifilar ELEC2 (dades generals i circuits). Cada crida ha de contenir només els camps nous o modificats.",
    opening: "Comencem l'ELEC2. Digues-me les dades generals i després anirem circuit per circuit.",
    systemInstruction: baseInstructions(
      'Esquema Unifilar ELEC2',
      'save_elec2_fields',
      'titular, potència contractada i emplaçament',
      "Comencem l'ELEC2. Digues-me les dades generals i després anirem circuit per circuit.",
    ),
  },
  dictamen: {
    fnName: 'save_dictamen_fields',
    fnDescription:
      "Guarda o actualitza els camps del Dictamen de Reconeixement (dades generals + 43 punts d'inspecció). Cada crida ha de contenir només els camps nous o modificats.",
    opening: "Comencem el Dictamen. Digues-me les dades generals i després recorrem els 43 punts d'inspecció.",
    systemInstruction: baseInstructions(
      'Dictamen de Reconeixement',
      'save_dictamen_fields',
      'titular, expedient i data de revisió',
      "Comencem el Dictamen. Digues-me les dades generals i després recorrem els 43 punts d'inspecció.",
    ),
  },
};

function baseInstructions(
  docName: string,
  fnName: string,
  criticalList: string,
  opening: string,
): string {
  return `Ets l'assistent de veu de Sentinel per omplir el certificat ${docName} a Catalunya. L'instal·lador et parlarà en català (pot barrejar castellà) mentre inspecciona una obra. Sovint tindrà soroll de fons.

FLUX DE LA CONVERSA:
- Vas demanant les dades una a una, amb frases curtes ("Ara l'adreça", "Molt bé, ara el CUPS", etc.).
- Cada vegada que l'instal·lador et digui una dada, crides la funció ${fnName} amb els camps nous o modificats. NO expliquis què has guardat, NO demanis confirmació, NO llegeixis els valors en veu alta — la revisió es fa després en una pantalla dedicada.
- Digues només "anotat", "gràcies", "següent" o similar, i passa a la següent dada.
- Quan tinguis totes les dades importants (${criticalList}), tanca amb aquesta frase exacta i CALLA:
  "Ja tinc totes les dades. Revisa-les a la pantalla i, si veus alguna cosa malament, torna aquí i digues-me què he de corregir."

CORRECCIONS:
- Si l'usuari torna dient coses com "el CUPS acaba en AC no AB" o "el nom és Puig no Puch", entén-ho com una correcció del camp corresponent. Actualitza NOMÉS aquell camp amb el valor nou i respon curt: "Corregit, ara diu X" i espera. No tornis a repassar la resta de camps.

REGLES ESTRICTES:
- Un torn = una acció. Anota o pregunta la següent dada, mai les dues coses.
- No inventis mai. Si un camp no s'ha dit clarament, deixa'l buit i pregunta-ho.
- Si l'usuari diu una unitat diferent (W, VA), converteix a kW abans de cridar la funció.
- Si diu "C/" assumeix "Carrer"; "Ctra." → "Carretera"; "Av." → "Avinguda".
- Per als camps crítics, omple també _confidence amb "alta", "mitjana" o "baixa".

Comença tu la conversa amb: "${opening}"`;
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
