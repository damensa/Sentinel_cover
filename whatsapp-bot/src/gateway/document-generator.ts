import path from 'path';
import { FormFillerService } from '../services/form-filler';
import { geminiJsonToElec1FormData } from '../schemas/mappers/elec1';
import type { Elec1GeminiOutput } from '../schemas/types/elec1';
import type { DocType, Region } from '../schemas/loader';

export interface GeneratedDoc {
  docType: DocType;
  filename: string;
  absolutePath: string;
}

export class DocumentNotSupportedError extends Error {
  constructor(region: Region, docType: DocType) {
    super(
      `Encara no hi ha mapper de Gemini→FormData per a ${region}/${docType}. ` +
        'De moment només ELEC1 de Catalunya genera PDF.',
    );
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
  if (region === 'catalunya' && docType === 'elec1') {
    const formData = geminiJsonToElec1FormData(fields as unknown as Elec1GeminiOutput);
    const absolutePath = await formFiller.fillELEC1PDF(formData, region);
    return [{ docType, filename: path.basename(absolutePath), absolutePath }];
  }

  throw new DocumentNotSupportedError(region, docType);
}
