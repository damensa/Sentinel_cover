// Verifica el tram final del pipeline de veu: JSON de Gemini → validació
// amb l'schema → FormFillerService → PDF al disc.
//
// El JSON és el que Gemini va retornar realment durant la primera conversa
// per veu des de la PWA (2026-08-02, §12 de PWA_VEU_INSTALLADOR.md).
//
// Ús: npx ts-node --transpile-only src/scripts/test-generate-elec1.ts

import fs from 'fs';
import { schemaLoader } from '../schemas/loader';
import { generateDocuments } from '../gateway/document-generator';

const fromVoice = {
  titular: {
    nif: '46789012M',
    nom_complet: 'Juan García Puig',
  },
  _confidence: {
    nom_complet: 'alta',
    nif: 'alta',
    cups: 'alta',
    potencia_kw: 'alta',
  },
  instalacio: {
    cups: 'ES0031405221001234AB',
    potencia_kw: 5.75,
    tensio: '230 V',
    us: "Instal·lacions d'habitatges",
  },
  emplacament: {
    nom_via: 'Diagonal',
    poblacio: 'Barcelona',
    codi_postal: '08037',
    num_via: '340',
  },
};

let failed = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log('  ✓', msg);
  else {
    console.error('  ✗', msg);
    failed++;
  }
}

async function main() {
  console.log('1. Validació contra elec1.schema.json');
  const v = schemaLoader.validate('catalunya', 'elec1', fromVoice);
  check(v.valid, 'el JSON de la conversa per veu és vàlid');
  if (!v.valid) console.error(v.errors);

  console.log('\n2. Generació del PDF');
  const docs = await generateDocuments('catalunya', 'elec1', fromVoice);
  check(docs.length === 1, 'retorna 1 document');

  const doc = docs[0];
  check(doc.docType === 'elec1', 'docType = elec1');
  check(/^CATALUNYA_ELEC1_filled_\d+\.pdf$/.test(doc.filename), `filename amb el patró esperat (${doc.filename})`);
  check(fs.existsSync(doc.absolutePath), 'el fitxer existeix al disc');

  const size = fs.existsSync(doc.absolutePath) ? fs.statSync(doc.absolutePath).size : 0;
  check(size > 10_000, `mida raonable per un PDF amb formulari (${size} bytes)`);

  const head = fs.existsSync(doc.absolutePath)
    ? fs.readFileSync(doc.absolutePath).subarray(0, 5).toString('latin1')
    : '';
  check(head === '%PDF-', `capçalera PDF vàlida ("${head}")`);

  console.log(`\n   Generat a: ${doc.absolutePath}`);

  console.log('\n3. Document no suportat encara falla amb claredat');
  try {
    await generateDocuments('catalunya', 'dictamen', {});
    check(false, 'hauria de llançar DocumentNotSupportedError');
  } catch (e) {
    check((e as Error).name === 'DocumentNotSupportedError', 'llança DocumentNotSupportedError per dictamen');
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} assertion(s) han fallat.`);
    process.exit(1);
  }
  console.log('\n✓ Pipeline complet: veu → JSON → schema → PDF.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
