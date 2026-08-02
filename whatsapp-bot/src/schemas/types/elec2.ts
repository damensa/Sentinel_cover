// Type per a la sortida de Gemini quan crida save_elec2_fields.
// Sincronitzat amb schemas/catalunya/elec2.schema.json.

import type { ConfidenceLevel } from './elec1';

export interface Elec2GeminiCircuit {
  receptor: string;
  potencia: string;
  seccio: string;
  pia: string;
  diferencial?: string;
}

export interface Elec2GeminiOutput {
  general: {
    empresa?: string;
    titular: string;
    emplacament: string;
    tensio: '230 V' | '3x230/400 V' | 'Altra';
    seccio_conexio_mm2?: number;
    iga_a?: number;
    potencia_contractada_kw: number;
  };
  circuits: Elec2GeminiCircuit[];
  _confidence?: Partial<Record<
    'titular' | 'potencia_contractada_kw' | 'emplacament',
    ConfidenceLevel
  >>;
}
