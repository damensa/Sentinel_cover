// Type per a la sortida de Gemini quan crida save_elec1_fields.
// Ha de mantenir-se sincronitzat amb whatsapp-bot/src/schemas/catalunya/elec1.schema.json.
// Escrit a mà per ara; es podrà regenerar amb json-schema-to-typescript més endavant.

export type ConfidenceLevel = 'alta' | 'mitjana' | 'baixa';

export interface Elec1GeminiOutput {
  titular: {
    nom_complet: string;
    nif: string;
    telefon?: string;
    email?: string;
    tipus_persona?: 'física' | 'jurídica';
  };
  emplacament: {
    tipus_via?: string;
    nom_via: string;
    num_via: string;
    bloc?: string;
    escala?: string;
    pis?: string;
    porta?: string;
    codi_postal: string;
    poblacio: string;
    comarca?: string;
    provincia?: string;
  };
  instalacio: {
    cups: string;
    potencia_kw: number;
    tensio: '230 V' | '3x230/400 V' | 'Altra';
    material_conductor?: 'Coure' | 'Alumini';
    ubicacio_comptadors?: 'Sala' | 'Armari' | 'Altra';
    tipus_connexio?: 'Assistida' | 'Interconnectada';
    categoria?: 'Bàsica' | 'Especialista';
    us: string;
    subministrament_complementari?: boolean;
  };
  _confidence?: Partial<Record<
    | 'nom_complet'
    | 'nif'
    | 'cups'
    | 'potencia_kw'
    | 'nom_via'
    | 'num_via'
    | 'poblacio'
    | 'codi_postal',
    ConfidenceLevel
  >>;
}
