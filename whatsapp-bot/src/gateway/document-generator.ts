import path from 'path';
import { FormFillerService } from '../services/form-filler';
import { geminiJsonToElec1FormData } from '../schemas/mappers/elec1';
import { geminiJsonToDRFormData } from '../schemas/mappers/dr';
import { geminiJsonToContractFormData } from '../schemas/mappers/contracte';
import { geminiJsonToElec2FormData } from '../schemas/mappers/elec2';
import { geminiJsonToDictamenFormData } from '../schemas/mappers/dictamen';
import type { Elec1GeminiOutput } from '../schemas/types/elec1';
import type { DrGeminiOutput } from '../schemas/types/dr';
import type { ContracteGeminiOutput } from '../schemas/types/contracte';
import type { Elec2GeminiOutput } from '../schemas/types/elec2';
import type { DictamenGeminiOutput } from '../schemas/types/dictamen';
import type { DocType, Region } from '../schemas/loader';

export interface GeneratedDoc {
  docType: DocType;
  filename: string;
  absolutePath: string;
}

export class DocumentNotSupportedError extends Error {
  constructor(region: Region, docType: DocType) {
    super(`Encara no hi ha generació de document per a ${region}/${docType}.`);
    this.name = 'DocumentNotSupportedError';
  }
}

const formFiller = new FormFillerService();

/**
 * Converteix el JSON que Gemini ha acumulat durant la conversa en documents
 * reals, reutilitzant el FormFillerService que ja fa servir el bot de WhatsApp.
 *
 * El JSON ha d'haver passat abans per schemaLoader.validate().
 */
export async function generateDocuments(
  region: Region,
  docType: DocType,
  fields: Record<string, any>,
): Promise<GeneratedDoc[]> {
  if (region !== 'catalunya') {
    throw new DocumentNotSupportedError(region, docType);
  }

  const absolutePath = await generateOne(docType, fields, region);
  return [{ docType, filename: path.basename(absolutePath), absolutePath }];
}

async function generateOne(
  docType: DocType,
  fields: Record<string, any>,
  region: Region,
): Promise<string> {
  switch (docType) {
    case 'elec1':
      return formFiller.fillELEC1PDF(
        geminiJsonToElec1FormData(fields as unknown as Elec1GeminiOutput),
        region,
      );
    case 'dr':
      return formFiller.fillDRPDF(
        geminiJsonToDRFormData(fields as unknown as DrGeminiOutput),
        region,
      );
    case 'contracte':
      return formFiller.fillContractPDF(
        geminiJsonToContractFormData(fields as unknown as ContracteGeminiOutput),
        region,
      );
    case 'elec2':
      return formFiller.fillElec2PDF(
        geminiJsonToElec2FormData(fields as unknown as Elec2GeminiOutput),
        region,
      );
    case 'dictamen':
      // Dictamen genera .docx en comptes de .pdf; el gateway ho serveix
      // igualment via res.download().
      return formFiller.fillDictamenDocx(
        geminiJsonToDictamenFormData(fields as unknown as DictamenGeminiOutput),
        region,
      );
    default: {
      const _exhaustive: never = docType;
      throw new DocumentNotSupportedError(region, _exhaustive);
    }
  }
}
