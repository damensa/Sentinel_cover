import type { DictamenFormData } from '../../services/form-filler';
import type { DictamenGeminiOutput } from '../types/dictamen';

export function geminiJsonToDictamenFormData(g: DictamenGeminiOutput): DictamenFormData {
  return {
    general: {
      titular: g.general.titular,
      // La interface original té una ç dins la clau (emplaçament). Mantenim
      // la clau tal com és, no és un typo.
      emplaçament: g.general.emplacament,
      localitat: g.general.localitat ?? '',
      cp: g.general.codi_postal ?? '',
      dataRevisio: g.general.data_revisio,
      activitat: g.general.activitat ?? '',
      expedient: g.general.expedient,
      empresaDistribuidora: g.general.empresa_distribuidora ?? '',
      potenciaMax: numToStr(g.general.potencia_max_kw),
      potenciaContractada: numToStr(g.general.potencia_contractada_kw),
      potenciaMaxComp: numToStr(g.general.potencia_max_comp_kw),
      potenciaContractadaComp: numToStr(g.general.potencia_contractada_comp_kw),
      tensio: g.general.tensio,
    },
    // El FormFillerService només guarda { id, observacio } (no té camp
    // estat). Fusionem l'estat com a prefix perquè no es perdi la
    // informació de compliment.
    anomalies: g.anomalies.map((a) => ({
      id: a.id,
      observacio: formatAnomalia(a.estat, a.observacio),
    })),
  };
}

function formatAnomalia(estat: string, observacio: string | undefined): string {
  const obs = (observacio ?? '').trim();
  if (estat === 'compleix') return obs; // el més comú, no cal soroll
  const tag = estat.toUpperCase();
  return obs ? `[${tag}] ${obs}` : `[${tag}]`;
}

function numToStr(n: number | undefined): string {
  return n === undefined || n === null ? '' : String(n);
}
