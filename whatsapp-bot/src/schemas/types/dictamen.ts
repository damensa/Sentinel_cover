// Type per a la sortida de Gemini quan crida save_dictamen_fields.
// Sincronitzat amb schemas/catalunya/dictamen.schema.json.

import type { ConfidenceLevel } from './elec1';

export type EstatAnomalia = 'compleix' | 'no compleix' | 'no aplica';

export interface DictamenAnomalia {
  id: number;
  estat: EstatAnomalia;
  observacio?: string;
}

export interface DictamenGeminiOutput {
  general: {
    titular: string;
    emplacament: string;
    localitat?: string;
    codi_postal?: string;
    data_revisio: string;
    activitat?: string;
    expedient: string;
    empresa_distribuidora?: string;
    tensio: '230 V' | '3x230/400 V' | 'Altra';
    potencia_max_kw?: number;
    potencia_contractada_kw?: number;
    potencia_max_comp_kw?: number;
    potencia_contractada_comp_kw?: number;
  };
  anomalies: DictamenAnomalia[];
  _confidence?: Partial<Record<'titular' | 'expedient' | 'data_revisio', ConfidenceLevel>>;
}
