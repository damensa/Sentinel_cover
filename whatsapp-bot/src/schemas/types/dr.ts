// Type per a la sortida de Gemini quan crida save_dr_fields.
// Sincronitzat amb schemas/catalunya/dr.schema.json.

import type { ConfidenceLevel } from './elec1';
import type { GeminiEmplacament } from '../mappers/_shared';

export interface DrGeminiOutput {
  titular: {
    nom_complet: string;
    nif: string;
    telefon?: string;
    email?: string;
    tipus_persona?: 'física' | 'jurídica';
  };
  declarant: {
    nom_complet: string;
    nif: string;
    telefon?: string;
    email?: string;
    tipus_persona?: 'física' | 'jurídica';
  };
  adreca: GeminiEmplacament;
  installacio: {
    tipus: string;
    camp_reglamentari?: string;
    cups: string;
  };
  _confidence?: Partial<Record<
    'titular_nom' | 'titular_nif' | 'declarant_nom' | 'declarant_nif' | 'cups' | 'adreca',
    ConfidenceLevel
  >>;
}
