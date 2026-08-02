// Type per a la sortida de Gemini quan crida save_contracte_fields.
// Sincronitzat amb schemas/catalunya/contracte.schema.json.

import type { ConfidenceLevel } from './elec1';
import type { GeminiEmplacament } from '../mappers/_shared';

export interface ContracteGeminiOutput {
  titular: {
    nom_complet: string;
    nif: string;
    telefon?: string;
    email?: string;
    tipus_persona?: 'física' | 'jurídica';
    adreca?: GeminiEmplacament;
  };
  representant: {
    nom_complet: string;
    nif: string;
    telefon?: string;
    email?: string;
    tipus_persona?: 'física' | 'jurídica';
  };
  installacio: {
    adreca: GeminiEmplacament;
    us: 'Habitatge' | 'Local' | 'Industrial' | 'Oficines' | 'Altres';
    potencia_max_kw?: number;
    potencia_installada_kw?: number;
    potencia_contractada_kw: number;
    superficie_m2?: number;
    tensio: '230 V' | '3x230/400 V' | 'Altra';
    num_expedient_bt?: string;
    empresa_comercialitzadora?: string;
    aporta_doc?: string;
    altres_dades?: string;
  };
  data: {
    dia: string;
    mes: string;
    any: string;
    ciutat: string;
  };
  _confidence?: Partial<Record<
    'titular_nom' | 'titular_nif' | 'potencia_contractada_kw' | 'num_expedient_bt' | 'adreca_installacio',
    ConfidenceLevel
  >>;
}
