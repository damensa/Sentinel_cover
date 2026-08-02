import { schemaLoader } from '../schemas/loader';

let failed = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log('  ✓', msg);
  else {
    console.error('  ✗', msg);
    failed++;
  }
}

async function main() {
  console.log('1. Valida el JSON real que Gemini va retornar (2026-08-01)');
  const validSample = {
    titular: { nom_complet: 'Joan García Puig', nif: '46789012M' },
    emplacament: {
      tipus_via: 'Avinguda',
      nom_via: 'Diagonal',
      num_via: '340',
      pis: 'Tercer',
      porta: 'Segona',
      codi_postal: '08037',
      poblacio: 'Barcelona',
    },
    instalacio: {
      cups: 'ES0031405221001234AB',
      potencia_kw: 5.75,
      tensio: '230 V',
      us: "Instal·lacions d'habitatges",
    },
    _confidence: { nif: 'alta', cups: 'alta' },
  };
  const r1 = schemaLoader.validate('catalunya', 'elec1', validSample);
  check(r1.valid, 'JSON de Gemini és vàlid');
  if (!r1.valid) console.error(r1.errors);

  console.log('\n2. Detecta camps requerits que falten');
  const missingRequired = {
    titular: { nom_complet: 'Joan Garcia' }, // falta nif
    emplacament: validSample.emplacament,
    instalacio: validSample.instalacio,
  };
  const r2 = schemaLoader.validate('catalunya', 'elec1', missingRequired);
  check(!r2.valid, 'JSON amb nif absent és invàlid');
  check(
    r2.errors.some((e) => e.keyword === 'required' && String(e.params?.missingProperty) === 'nif'),
    "l'error identifica la propietat 'nif' com a required",
  );

  console.log('\n3. Detecta valors fora d\'enum');
  const badEnum = {
    ...validSample,
    instalacio: { ...validSample.instalacio, tensio: '500 kV' as any },
  };
  const r3 = schemaLoader.validate('catalunya', 'elec1', badEnum);
  check(!r3.valid, "tensio = '500 kV' és invàlid");
  check(
    r3.errors.some((e) => e.keyword === 'enum'),
    "l'error és de tipus 'enum'",
  );

  console.log('\n4. Detecta CUPS que no compleix el pattern');
  const badCups = {
    ...validSample,
    instalacio: { ...validSample.instalacio, cups: 'abc' },
  };
  const r4 = schemaLoader.validate('catalunya', 'elec1', badCups);
  check(!r4.valid, "cups = 'abc' és invàlid (no compleix pattern)");

  console.log('\n5. Bundlejat per a Gemini');
  const bundled = schemaLoader.bundleForGemini('catalunya', 'elec1');
  const bundledStr = JSON.stringify(bundled);
  check(!bundledStr.includes('$ref'), 'no queden $ref al bundle');
  check(!bundledStr.includes('$defs'), 'no queden $defs al bundle');
  check(
    !bundledStr.includes('"required"'),
    "no queda 'required' al bundle (Gemini ha de poder cridar amb dades parcials)",
  );
  check(!bundledStr.includes('$id'), 'no queda $id al bundle');
  check(!bundledStr.includes('pattern'), 'no queda pattern al bundle');
  check(bundled.type === 'object', 'top-level type és object');
  check(!!bundled.properties?.titular?.properties?.nom_complet, 'titular.nom_complet inlined');
  check(!!bundled.properties?.emplacament?.properties?.nom_via, 'emplacament.nom_via inlined');
  check(
    Array.isArray(bundled.properties?.emplacament?.properties?.tipus_via?.enum),
    'enum de tipus_via preservat',
  );

  console.log('\n6. Els altres 4 documents també validen (schemes carregats)');
  for (const doc of ['dr', 'contracte', 'elec2', 'dictamen'] as const) {
    try {
      const b = schemaLoader.bundleForGemini('catalunya', doc);
      check(b.type === 'object', `${doc}: schema bundlejat OK`);
    } catch (e) {
      check(false, `${doc}: ${(e as Error).message}`);
    }
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} assertion(s) han fallat.`);
    process.exit(1);
  }
  console.log('\n✓ Loader OK. Validació ajv i bundle per Gemini funcionen.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
