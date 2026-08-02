import type { DRFormData } from '../../services/form-filler';
import type { DrGeminiOutput } from '../types/dr';

export function geminiJsonToDRFormData(g: DrGeminiOutput): DRFormData {
  const poblacio = g.adreca?.poblacio ?? '';
  return {
    titular: {
      nom: g.titular.nom_complet,
      nif: g.titular.nif,
    },
    installacio: {
      tipus: g.installacio.tipus,
      campReglamentari: g.installacio.camp_reglamentari ?? '',
      cups: g.installacio.cups,
    },
    adreca: {
      tipusVia: g.adreca?.tipus_via,
      nomVia: g.adreca?.nom_via ?? '',
      numero: g.adreca?.num_via ?? '',
      poblacio,
      codiPostal: g.adreca?.codi_postal ?? '',
      // A Catalunya poblacio i municipi solen coincidir; si Gemini no diu
      // res específic, els deixem igualats. Es pot separar més endavant.
      municipi: poblacio,
      comarca: g.adreca?.comarca ?? '',
    },
    declarant: {
      nom: g.declarant.nom_complet,
      nif: g.declarant.nif,
      // Per defecte 'física' quan no s'ha capturat; és el cas majoritari.
      tipusPersona: g.declarant.tipus_persona ?? 'física',
    },
  };
}
