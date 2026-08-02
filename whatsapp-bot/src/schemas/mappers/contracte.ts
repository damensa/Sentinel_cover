import type { ContractFormData } from '../../services/form-filler';
import type { ContracteGeminiOutput } from '../types/contracte';
import { formatAddressLine } from './_shared';

export function geminiJsonToContractFormData(g: ContracteGeminiOutput): ContractFormData {
  const tAdreca = g.titular.adreca;
  const iAdreca = g.installacio.adreca;

  return {
    titular: {
      nom: g.titular.nom_complet,
      nif: g.titular.nif,
      correu: g.titular.email ?? '',
      adreca: formatAddressLine(tAdreca),
      poblacio: tAdreca?.poblacio ?? '',
      codiPostal: tAdreca?.codi_postal ?? '',
      tel: g.titular.telefon ?? '',
    },
    representant: {
      nom: g.representant.nom_complet,
      dni: g.representant.nif,
    },
    installacio: {
      adreca: formatAddressLine(iAdreca),
      poblacio: iAdreca?.poblacio ?? '',
      us: g.installacio.us,
      potenciaMax: numToStr(g.installacio.potencia_max_kw),
      superficie: numToStr(g.installacio.superficie_m2),
      potenciaInstallada: numToStr(g.installacio.potencia_installada_kw),
      tensio: g.installacio.tensio,
      potenciaContractada: numToStr(g.installacio.potencia_contractada_kw),
      numExpedientBT: g.installacio.num_expedient_bt ?? '',
      empresaComercialitzadora: g.installacio.empresa_comercialitzadora ?? '',
      aportaDoc: g.installacio.aporta_doc ?? '',
      altresDades: g.installacio.altres_dades ?? '',
    },
    data: {
      dia: g.data.dia,
      mes: g.data.mes,
      any: g.data.any,
      ciutat: g.data.ciutat,
    },
  };
}

function numToStr(n: number | undefined): string {
  return n === undefined || n === null ? '' : String(n);
}
