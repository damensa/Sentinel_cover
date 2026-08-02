import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type Region = 'catalunya';
export type DocType = 'elec1' | 'dr' | 'contracte' | 'elec2' | 'dictamen';

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

const SCHEMA_ID_BASE = 'https://sentinel.local/schemas';

// Camps que Gemini no accepta (o ignora) al function calling, o que
// contradiuen el disseny de crides parcials.
//
// 'required' és el cas important: el system prompt demana explícitament
// que Gemini crida la funció amb NOMÉS els camps nous o modificats a
// cada torn ("Retorna només els camps nous o modificats"). Si el deixem
// al schema que rebem Gemini, el model interpreta que necessita tenir
// TOTS els camps required (titular + declarant + adreca + installacio
// per al DR, per exemple) abans de gosar cridar la funció — i es queda
// conversant en comptes d'anotar parcialment. Detectat el 2026-08-02:
// amb DR, dir només el titular no disparava mai el toolCall.
//
// La completesa final es verifica igualment a POST /submit, que valida
// amb ajv contra l'schema ORIGINAL (amb 'required' intacte) via
// schemaLoader.validate() — aquest strip només afecta el que es declara
// a Gemini per al function calling en viu.
const GEMINI_STRIP_KEYS = new Set([
  '$schema', '$id', '$defs', '$ref',
  'pattern', 'format',
  'title', 'default',
  'additionalProperties',
  'required',
]);

export class SchemaLoader {
  private ajv: Ajv2020;
  private schemasDir: string;
  private shared: any;

  constructor() {
    this.ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.schemasDir = path.resolve(__dirname);
    this.shared = this.loadJson(path.join(this.schemasDir, '_shared.json'));
    this.loadAll();
  }

  private loadJson(p: string): any {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  private loadAll(): void {
    this.ajv.addSchema(this.shared);

    const regions: Region[] = ['catalunya'];
    for (const region of regions) {
      const regionDir = path.join(this.schemasDir, region);
      if (!fs.existsSync(regionDir)) continue;
      for (const file of fs.readdirSync(regionDir)) {
        if (!file.endsWith('.schema.json')) continue;
        const schema = this.loadJson(path.join(regionDir, file));
        this.ajv.addSchema(schema);
      }
    }
  }

  private schemaId(region: Region, docType: DocType): string {
    return `${SCHEMA_ID_BASE}/${region}/${docType}.schema.json`;
  }

  private schemaPath(region: Region, docType: DocType): string {
    return path.join(this.schemasDir, region, `${docType}.schema.json`);
  }

  validate(region: Region, docType: DocType, data: unknown): ValidationResult {
    const validate = this.ajv.getSchema(this.schemaId(region, docType)) as
      | ValidateFunction
      | undefined;
    if (!validate) {
      throw new Error(`Schema not registered: ${this.schemaId(region, docType)}`);
    }
    const valid = validate(data);
    return { valid: !!valid, errors: (validate.errors ?? []) as ErrorObject[] };
  }

  bundleForGemini(region: Region, docType: DocType): any {
    const doc = this.loadJson(this.schemaPath(region, docType));
    const inlined = inlineSharedRefs(doc, this.shared);
    return stripForGemini(inlined);
  }
}

const EXTERNAL_REF_RE = /^\.\.\/_shared\.json#\/\$defs\/([A-Za-z0-9_]+)$/;
const INTERNAL_REF_RE = /^#\/\$defs\/([A-Za-z0-9_]+)$/;

function inlineSharedRefs(node: any, shared: any): any {
  if (Array.isArray(node)) return node.map((n) => inlineSharedRefs(n, shared));
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string') {
      const m = node.$ref.match(EXTERNAL_REF_RE) ?? node.$ref.match(INTERNAL_REF_RE);
      if (!m) throw new Error(`Unsupported $ref format: ${node.$ref}`);
      const def = shared.$defs?.[m[1]];
      if (!def) throw new Error(`Unknown $def: ${m[1]}`);
      const { $ref: _drop, ...siblings } = node;
      return { ...inlineSharedRefs(def, shared), ...inlineSharedRefs(siblings, shared) };
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = inlineSharedRefs(v, shared);
    }
    return out;
  }
  return node;
}

function stripForGemini(node: any): any {
  if (Array.isArray(node)) return node.map(stripForGemini);
  if (node && typeof node === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      if (GEMINI_STRIP_KEYS.has(k)) continue;
      out[k] = stripForGemini(v);
    }
    return out;
  }
  return node;
}

export const schemaLoader = new SchemaLoader();
