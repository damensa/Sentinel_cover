// Test dels dos fixes de la DR Catalunya:
//   Bug A: el declarant no ha de ser sobreescrit pel titular.
//   Bug B: els camps d'adreça han d'arribar al PDF via patch del template.
//
// Ús: npx ts-node --transpile-only src/scripts/test-dr-xfa-fixes.ts

import fs from 'fs';
import zlib from 'zlib';
import { PDFDocument, PDFName } from 'pdf-lib';
import { FormFillerService } from '../services/form-filler';

const filler = new FormFillerService();

const sample = {
  titular: { nom: 'TITULAR PROVA UN', nif: '11111111A' },
  declarant: { nom: 'DECLARANT PROVA DOS', nif: '22222222B', tipusPersona: 'REP' },
  adreca: {
    tipusVia: 'Carrer',
    nomVia: 'Test',
    numero: '42',
    bloc: 'B',
    escala: '2',
    pis: '3',
    porta: '4',
    codiPostal: '08001',
    poblacio: 'Barcelona',
    municipi: 'Barcelona',
    comarca: 'Barcelonès',
  },
  installacio: { tipus: 'Habitatge', campReglamentari: 'ITC-BT-10', cups: 'ES1234567890123456AB' },
};

let failed = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log('  ✓', msg);
  else { console.error('  ✗', msg); failed++; }
}

async function readPacket(pdfPath: string, packetName: string): Promise<string> {
  const raw = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(raw, { ignoreEncryption: true });
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
  const acroForm = doc.context.lookup(acroFormRef!) as any;
  const xfaRef = acroForm.get(PDFName.of('XFA'));
  const xfa = doc.context.lookup(xfaRef) as any;
  for (let i = 0; i < xfa.size(); i += 2) {
    const name = String(doc.context.lookup(xfa.get(i)));
    if (name.includes(packetName)) {
      const stream = doc.context.lookup(xfa.get(i + 1)) as any;
      let contents = stream.contents as Buffer;
      const filter = stream.dict.get(PDFName.of('Filter'));
      if (filter && String(filter).includes('FlateDecode')) contents = zlib.inflateSync(contents);
      return Buffer.from(contents).toString('utf8');
    }
  }
  throw new Error(`packet ${packetName} not found`);
}

async function main() {
  console.log('=== Generant DR Catalunya amb dades diferenciades ===');
  const outPath = await filler.fillDRPDF(sample as any, 'catalunya');
  console.log('Generat a:', outPath);

  const datasets = await readPacket(outPath, 'datasets');
  const template = await readPacket(outPath, 'template');

  console.log('\n--- Bug A: titular vs declarant ---');
  check(datasets.includes('TITULAR PROVA UN'), 'datasets conté el nom del titular');
  check(datasets.includes('DECLARANT PROVA DOS'), 'datasets conté el nom del declarant');
  check(datasets.includes('11111111A'), 'datasets conté el NIF del titular');
  check(datasets.includes('22222222B'), 'datasets conté el NIF del declarant');

  // Verifiquem que el titular no ha contaminat el bloc del declarant
  const declBlock = datasets.match(/<sDeclaracio\s*>([\s\S]*?)<\/sDeclaracio\s*>/);
  if (!declBlock) check(false, 'bloc <sDeclaracio> trobat al datasets');
  else {
    const inside = declBlock[1];
    check(inside.includes('DECLARANT PROVA DOS'), '  → el bloc <sDeclaracio> conté el DECLARANT');
    check(!inside.includes('TITULAR PROVA UN'), '  → el bloc <sDeclaracio> NO conté el titular (bug A no reapareix)');
  }

  console.log('\n--- Bug B: camps d\'adreça ---');
  // Els noms al datasets han d'aparèixer com nodes injectats sota ADRECA/ADRECA_POSTAL
  const adrecaBlock = datasets.match(/<ADRECA_POSTAL\s*>([\s\S]*?)<\/ADRECA_POSTAL\s*>/);
  if (!adrecaBlock) check(false, 'bloc <ADRECA_POSTAL> trobat');
  else {
    const inside = adrecaBlock[1];
    for (const [tag, val] of Object.entries({
      TIPUS_VIA: 'Carrer',
      NOM_VIA: 'Test',
      NUM_VIA: '42',
      BLOC: 'B',
      ESCALA: '2',
      PIS: '3',
      PORTA: '4',
      CODI_POSTAL: '08001',
      POBLACIO: 'Barcelona',
      MUNICIPI: 'Barcelona',
      COMARCA: 'Barcelonès',
    })) {
      check(
        new RegExp(`<${tag}\\s*>${val}</${tag}\\s*>`).test(inside),
        `  → <${tag}>${val}</${tag}> present`,
      );
    }
  }

  console.log('\n--- Template patchat: bind="none" convertit a bind ref ---');
  const patchedFields = ['TXT_NomVia', 'TXT_NumVia', 'TXT_Bloc', 'TXT_Escala', 'TXT_Pis', 'TXT_Porta', 'TXT_CodiPostal', 'TXT_Poblacio', 'TXT_Municipi', 'TXT_Comarca', 'TXT_Provincia'];
  for (const fieldName of patchedFields) {
    const fieldRegex = new RegExp(`<field\\s+name="${fieldName}"[\\s\\S]*?</field\\s*>`, 'g');
    let anyPatched = false;
    let m: RegExpExecArray | null;
    while ((m = fieldRegex.exec(template))) {
      if (m[0].includes('match="dataRef"')) anyPatched = true;
    }
    check(anyPatched, `  → ${fieldName} té ara bind match="dataRef" (patched)`);
  }

  console.log('\n--- Sanitat: capçalera PDF vàlida ---');
  const head = fs.readFileSync(outPath).subarray(0, 5).toString('latin1');
  check(head === '%PDF-', `capçalera vàlida (${head})`);

  fs.unlinkSync(outPath);

  if (failed > 0) {
    console.error(`\n✗ ${failed} assertion(s) han fallat.`);
    process.exit(1);
  }
  console.log('\n✓ Els dos bugs de la DR estan resolts.');
}

main().catch((e) => { console.error(e); process.exit(1); });
