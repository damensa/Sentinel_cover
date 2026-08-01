import fs from 'fs';
import path from 'path';
import type { Elec1FormData } from '../../services/form-filler';
import type { Elec1GeminiOutput } from '../types/elec1';

interface Elec1FieldMap {
  fields: Array<{
    id: string;
    internalName: string;
    type: 'dropdown' | 'radio' | 'text';
    mapping?: Record<string, string>;
  }>;
}

let cachedFieldMap: Elec1FieldMap | null = null;

function loadElec1FieldMap(): Elec1FieldMap {
  if (cachedFieldMap) return cachedFieldMap;
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const raw = fs.readFileSync(path.join(projectRoot, 'field_map.json'), 'utf8');
  cachedFieldMap = JSON.parse(raw) as Elec1FieldMap;
  return cachedFieldMap;
}

function getMappingFor(id: string, map: Elec1FieldMap): Record<string, string> | null {
  const field = map.fields.find((f) => f.id === id);
  return field?.mapping ?? null;
}

function resolveCode(
  humanValue: string | undefined,
  mapping: Record<string, string> | null,
): string | undefined {
  if (humanValue === undefined || humanValue === null) return undefined;
  if (!mapping) return humanValue;
  if (mapping[humanValue] !== undefined) return mapping[humanValue];
  for (const [key, code] of Object.entries(mapping)) {
    if (key.replace(/^[a-zñç]\)\s*/i, '') === humanValue) return code;
  }
  return humanValue;
}

export function geminiJsonToElec1FormData(gemini: Elec1GeminiOutput): Elec1FormData {
  const fmap = loadElec1FieldMap();

  const adreca = {
    tipusVia: resolveCode(gemini.emplacament.tipus_via, getMappingFor('tipus_via', fmap)),
    nomVia: gemini.emplacament.nom_via,
    numero: gemini.emplacament.num_via,
    bloc: gemini.emplacament.bloc,
    escala: gemini.emplacament.escala,
    pis: gemini.emplacament.pis,
    porta: gemini.emplacament.porta,
    codiPostal: gemini.emplacament.codi_postal,
    poblacio: gemini.emplacament.poblacio,
  };

  const subCompl = gemini.instalacio.subministrament_complementari;
  const subComplCode =
    subCompl === undefined
      ? undefined
      : resolveCode(subCompl ? 'Sí' : 'No', getMappingFor('subministrament_complementari', fmap));

  return {
    titular: {
      nomCognoms: gemini.titular.nom_complet,
      nif: gemini.titular.nif,
      tel: gemini.titular.telefon,
      correu: gemini.titular.email,
    },
    adreca,
    installacio: { ...adreca },
    caracteristiques: {
      cups: gemini.instalacio.cups,
      potenciaMax: String(gemini.instalacio.potencia_kw),
      tensio: gemini.instalacio.tensio,
      us: resolveCode(gemini.instalacio.us, getMappingFor('us_instalacio', fmap)) ?? gemini.instalacio.us,
      materialConductor: resolveCode(gemini.instalacio.material_conductor, getMappingFor('material_conductor', fmap)),
      ubicacioComptadors: resolveCode(gemini.instalacio.ubicacio_comptadors, getMappingFor('ubicacio_comptadors', fmap)),
      tipusConnexio: resolveCode(gemini.instalacio.tipus_connexio, getMappingFor('tipus_connexio', fmap)),
      subministramentComplementari: subComplCode,
      circuits: '',
      iga: '',
      resistenciaAillament: '',
      resistenciaTerra: '',
      calibreCGP: '',
      igm: '',
      lga: '',
      observacions: '',
      tipusActuacio: '',
      requisits: '',
    },
  };
}
