// Helpers reutilitzats pels mappers de Gemini → FormData.

export interface GeminiEmplacament {
  tipus_via?: string;
  nom_via?: string;
  num_via?: string;
  bloc?: string;
  escala?: string;
  pis?: string;
  porta?: string;
  codi_postal?: string;
  poblacio?: string;
  comarca?: string;
  provincia?: string;
}

/**
 * Formata un Emplacament com a text pla d'una sola línia, útil per als
 * documents que tenen l'adreça com a string (per exemple el Contracte
 * Manteniment BT o l'emplaçament de l'ELEC2).
 */
export function formatAddressLine(e: GeminiEmplacament | undefined): string {
  if (!e) return '';
  const line1 = [e.tipus_via, e.nom_via, e.num_via].filter(Boolean).join(' ').trim();
  const localBits = [
    e.bloc && `bl ${e.bloc}`,
    e.escala && `esc ${e.escala}`,
    e.pis,
    e.porta,
  ].filter(Boolean);
  const localPart = localBits.length ? ', ' + localBits.join(' ') : '';
  const cpMun = [e.codi_postal, e.poblacio].filter(Boolean).join(' ');
  return [line1 + localPart, cpMun].filter((s) => s && s.trim()).join(', ');
}
