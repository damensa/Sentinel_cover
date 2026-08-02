import type { Elec2FormData } from '../../services/form-filler';
import type { Elec2GeminiOutput } from '../types/elec2';

export function geminiJsonToElec2FormData(g: Elec2GeminiOutput): Elec2FormData {
  return {
    general: {
      empresa: g.general.empresa ?? '',
      tensio: g.general.tensio,
      seccioConexio: numToStr(g.general.seccio_conexio_mm2),
      iga: numToStr(g.general.iga_a),
      potenciaContractada: numToStr(g.general.potencia_contractada_kw),
      // La interface original té una ç dins la clau (emplaçament). Mantenim
      // la clau tal com és, no és un typo.
      emplaçament: g.general.emplacament,
      titular: g.general.titular,
    },
    circuits: g.circuits.map((c) => ({
      receptor: c.receptor,
      potencia: c.potencia,
      seccio: c.seccio,
      pia: c.pia,
      diferencial: c.diferencial ?? '',
    })),
  };
}

function numToStr(n: number | undefined): string {
  return n === undefined || n === null ? '' : String(n);
}
