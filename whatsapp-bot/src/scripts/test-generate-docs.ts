// Verifica el tram final del pipeline de veu per als 5 documents de
// Catalunya: JSON de Gemini → validació amb l'schema → FormFillerService →
// PDF (o .docx per al Dictamen) al disc.
//
// Ús: npx ts-node --transpile-only src/scripts/test-generate-elec1.ts

import fs from 'fs';
import { schemaLoader, type DocType } from '../schemas/loader';
import { generateDocuments } from '../gateway/document-generator';

// El JSON d'ELEC1 és el que Gemini va retornar realment a la primera
// conversa per veu des de la PWA (2026-08-02, §12 de
// PWA_VEU_INSTALLADOR.md). Els altres 4 són construïts arran dels schemes
// de Catalunya, valors realistes.

const SAMPLES: Record<DocType, Record<string, any>> = {
  elec1: {
    titular: { nif: '46789012M', nom_complet: 'Juan García Puig' },
    emplacament: {
      nom_via: 'Diagonal', num_via: '340',
      codi_postal: '08037', poblacio: 'Barcelona',
    },
    instalacio: {
      cups: 'ES0031405221001234AB', potencia_kw: 5.75,
      tensio: '230 V', us: "Instal·lacions d'habitatges",
    },
    _confidence: { nom_complet: 'alta', nif: 'alta', cups: 'alta', potencia_kw: 'alta' },
  },
  dr: {
    titular: { nom_complet: 'Joan Garcia Puig', nif: '46789012M' },
    declarant: { nom_complet: 'Joan Garcia i Pons', nif: '44556677Z', tipus_persona: 'física' },
    adreca: {
      tipus_via: 'Avinguda', nom_via: 'Diagonal', num_via: '340',
      codi_postal: '08037', poblacio: 'Barcelona', comarca: 'Barcelonès',
    },
    installacio: { tipus: 'Habitatge', cups: 'ES0031405221001234AB' },
  },
  contracte: {
    titular: {
      nom_complet: 'Joan Garcia Puig', nif: '46789012M', telefon: '600000000',
      email: 'joan@example.cat',
      adreca: {
        tipus_via: 'Avinguda', nom_via: 'Diagonal', num_via: '340',
        codi_postal: '08037', poblacio: 'Barcelona',
      },
    },
    representant: { nom_complet: 'Joan Garcia Puig', nif: '46789012M' },
    installacio: {
      adreca: {
        tipus_via: 'Avinguda', nom_via: 'Diagonal', num_via: '340',
        codi_postal: '08037', poblacio: 'Barcelona',
      },
      us: 'Habitatge', potencia_max_kw: 5.75, potencia_installada_kw: 5.75,
      potencia_contractada_kw: 5.75, tensio: '230 V',
      num_expedient_bt: 'CAT-2026-01234', empresa_comercialitzadora: 'Endesa',
    },
    data: { dia: '02', mes: 'agost', any: '2026', ciutat: 'Barcelona' },
  },
  elec2: {
    general: {
      empresa: 'Instal·lacions Elèctriques Sabadell S.L.',
      titular: 'Joan Garcia Puig',
      emplacament: 'Av. Diagonal 340, 08037 Barcelona',
      tensio: '230 V', seccio_conexio_mm2: 6, iga_a: 25,
      potencia_contractada_kw: 5.75,
    },
    circuits: [
      { receptor: 'Il·luminació', potencia: '500 W', seccio: '1.5', pia: '10', diferencial: '30 mA' },
      { receptor: 'Endolls', potencia: '2500 W', seccio: '2.5', pia: '16', diferencial: '30 mA' },
      { receptor: 'Cuina', potencia: '5000 W', seccio: '6', pia: '25' },
    ],
  },
  dictamen: {
    general: {
      titular: 'Joan Garcia Puig',
      emplacament: 'Av. Diagonal 340, 08037 Barcelona',
      localitat: 'Barcelona', codi_postal: '08037',
      data_revisio: '2026-08-02', activitat: 'Habitatge',
      expedient: 'CAT-2026-01234', empresa_distribuidora: 'E-Distribución',
      tensio: '230 V', potencia_max_kw: 5.75, potencia_contractada_kw: 5.75,
    },
    // El schema demana 43 exactes; els generem tots amb "compleix" per defecte
    // i marquem un parell d'exemple amb "no compleix" / "no aplica".
    anomalies: Array.from({ length: 43 }, (_, i) => {
      const id = i + 1;
      if (id === 7) return { id, estat: 'no compleix', observacio: 'Falta posada a terra a la cuina' };
      if (id === 13) return { id, estat: 'no aplica', observacio: 'Circuit específic no instal·lat' };
      return { id, estat: 'compleix' };
    }),
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
  const docs: DocType[] = ['elec1', 'dr', 'contracte', 'elec2', 'dictamen'];

  for (const docType of docs) {
    console.log(`\n== ${docType.toUpperCase()} ==`);

    console.log('1. Validació contra schema');
    const v = schemaLoader.validate('catalunya', docType, SAMPLES[docType]);
    check(v.valid, `${docType}: JSON de mostra és vàlid`);
    if (!v.valid) {
      console.error('   errors:', JSON.stringify(v.errors, null, 2));
      continue; // no cal intentar generar si l'schema falla
    }

    console.log('2. Generació');
    try {
      const generated = await generateDocuments('catalunya', docType, SAMPLES[docType]);
      check(generated.length === 1, `${docType}: retorna 1 document`);
      const doc = generated[0];
      check(doc.docType === docType, `${docType}: docType correcte`);
      check(fs.existsSync(doc.absolutePath), `${docType}: fitxer al disc (${doc.filename})`);
      const size = fs.statSync(doc.absolutePath).size;
      check(size > 5_000, `${docType}: mida raonable (${size} bytes)`);

      const head = fs.readFileSync(doc.absolutePath).subarray(0, 4).toString('latin1');
      const isPdf = head === '%PDF';
      const isDocx = head === 'PK'; // ZIP magic (DOCX = ZIP)
      check(isPdf || isDocx, `${docType}: capçalera vàlida (${isPdf ? 'PDF' : isDocx ? 'DOCX' : head})`);
    } catch (e) {
      check(false, `${docType}: ${(e as Error).message}`);
    }
  }

  console.log('\n== Errors clars per docType desconegut ==');
  try {
    await generateDocuments('arago' as any, 'elec1', {});
    check(false, 'Aragó hauria de llançar DocumentNotSupportedError');
  } catch (e) {
    check((e as Error).name === 'DocumentNotSupportedError', 'Aragó → DocumentNotSupportedError');
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} assertion(s) han fallat.`);
    process.exit(1);
  }
  console.log('\n✓ Els 5 documents de Catalunya es generen des de la sortida de Gemini.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
