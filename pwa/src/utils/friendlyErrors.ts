// Tradueix els errors crus d'ajv (que arriben de POST /submit) a missatges
// entenedors en català per a un instal·lador sense coneixements tècnics.

export interface AjvLikeError {
  instancePath: string;
  keyword: string;
  message?: string;
  params?: Record<string, any>;
}

const FIELD_LABELS: Record<string, string> = {
  titular: 'el titular',
  declarant: 'el declarant',
  representant: 'el representant',
  adreca: "l'adreça",
  emplacament: "l'adreça",
  installacio: 'les dades de la instal·lació',
  general: 'les dades generals',
  data: 'la data',
  anomalies: 'els punts d\'inspecció',

  nom_complet: 'el nom complet',
  nif: 'el NIF',
  telefon: 'el telèfon',
  email: 'el correu electrònic',

  tipus_via: 'el tipus de via',
  nom_via: 'el nom del carrer',
  num_via: 'el número del carrer',
  bloc: 'el bloc',
  escala: "l'escala",
  pis: 'el pis',
  porta: 'la porta',
  codi_postal: 'el codi postal',
  poblacio: 'la població',
  comarca: 'la comarca',
  provincia: 'la província',

  cups: 'el CUPS',
  potencia_kw: 'la potència',
  potencia_max_kw: 'la potència màxima',
  potencia_installada_kw: 'la potència instal·lada',
  potencia_contractada_kw: 'la potència contractada',
  tensio: 'la tensió',
  us: "l'ús de la instal·lació",
  tipus: 'el tipus',
  expedient: "l'expedient",
  activitat: "l'activitat",
  data_revisio: 'la data de revisió',
  empresa_distribuidora: 'la distribuïdora',
  num_expedient_bt: "el número d'expedient",
};

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

function lastSegment(instancePath: string): string | null {
  const parts = instancePath.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function specificPatternMessage(fieldKey: string): string | null {
  switch (fieldKey) {
    case 'cups':
      return 'El CUPS no té el format correcte: ha de començar per "ES", seguit de 16 xifres i 2 lletres (20 caràcters en total, o 22 en format llarg).';
    case 'nif':
      return 'El NIF/NIE no té el format correcte: 8 xifres i una lletra (o X/Y/Z + 7 xifres + lletra per a NIE).';
    case 'codi_postal':
      return 'El codi postal ha de tenir 5 xifres.';
    case 'telefon':
      return 'El telèfon no té un format vàlid.';
    default:
      return null;
  }
}

/** Un missatge per error. Pot haver-hi duplicats si el mateix camp falla per dos motius. */
export function friendlyErrorMessages(errors: AjvLikeError[]): string[] {
  const out: string[] = [];

  for (const err of errors) {
    const contextKey = lastSegment(err.instancePath);
    const contextLabel = contextKey ? labelFor(contextKey) : null;

    if (err.keyword === 'required') {
      const missing = String(err.params?.missingProperty ?? '');
      const missingLabel = labelFor(missing);
      out.push(
        contextLabel
          ? `Falta ${missingLabel} (dins ${contextLabel}).`
          : `Falta ${missingLabel}.`,
      );
      continue;
    }

    if (err.keyword === 'pattern') {
      const fieldKey = contextKey ?? '';
      const specific = specificPatternMessage(fieldKey);
      out.push(specific ?? `El valor de ${contextLabel ?? 'aquest camp'} no té el format correcte.`);
      continue;
    }

    if (err.keyword === 'enum') {
      out.push(`El valor de ${contextLabel ?? 'aquest camp'} no és un dels valors acceptats.`);
      continue;
    }

    if (err.keyword === 'minItems' || err.keyword === 'maxItems') {
      out.push(`${contextLabel ?? 'La llista'} no té el nombre correcte d'elements (${err.message ?? ''}).`);
      continue;
    }

    if (err.keyword === 'type') {
      out.push(`El valor de ${contextLabel ?? 'aquest camp'} no és del tipus esperat.`);
      continue;
    }

    // Fallback: mostrem el missatge original d'ajv, almenys en context.
    out.push(contextLabel ? `${contextLabel}: ${err.message ?? 'valor no vàlid'}.` : (err.message ?? 'Error de validació.'));
  }

  // Sense duplicats exactes.
  return Array.from(new Set(out));
}
