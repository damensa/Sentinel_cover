import { geminiJsonToElec1FormData } from '../schemas/mappers/elec1';
import type { Elec1GeminiOutput } from '../schemas/types/elec1';

// JSON exacte que Gemini 3.1 Flash Live Preview va retornar durant la validació
// del 2026-08-01 (§11 de PWA_VEU_INSTALLADOR.md).
const geminiSample: Elec1GeminiOutput = {
  titular: {
    nom_complet: 'Joan García Puig',
    nif: '46789012M',
  },
  emplacament: {
    codi_postal: '08037',
    porta: 'Segona',
    poblacio: 'Barcelona',
    num_via: '340',
    nom_via: 'Diagonal',
    tipus_via: 'Avinguda',
    pis: 'Tercer',
  },
  instalacio: {
    potencia_kw: 5.75,
    tensio: '230 V',
    us: "Instal·lacions d'habitatges",
    cups: 'ES0031405221001234AB',
  },
  _confidence: {
    nom_complet: 'alta',
    cups: 'alta',
    num_via: 'alta',
    nom_via: 'alta',
    nif: 'alta',
    codi_postal: 'alta',
    poblacio: 'alta',
    potencia_kw: 'alta',
  },
};

const result = geminiJsonToElec1FormData(geminiSample);

console.log('Output del mapper:');
console.log(JSON.stringify(result, null, 2));
console.log();

let failed = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✓', msg);
  } else {
    console.error('  ✗', msg);
    failed++;
  }
}

console.log('Assertions:');
check(result.titular.nomCognoms === 'Joan García Puig', 'titular.nomCognoms');
check(result.titular.nif === '46789012M', 'titular.nif');
check(result.adreca.tipusVia === 'AVI', "adreca.tipusVia = 'AVI' (mapejat des de 'Avinguda')");
check(result.adreca.nomVia === 'Diagonal', 'adreca.nomVia');
check(result.adreca.numero === '340', 'adreca.numero');
check(result.adreca.pis === 'Tercer', 'adreca.pis');
check(result.adreca.porta === 'Segona', 'adreca.porta');
check(result.adreca.codiPostal === '08037', 'adreca.codiPostal');
check(result.adreca.poblacio === 'Barcelona', 'adreca.poblacio');
check(result.installacio.tipusVia === 'AVI', 'installacio.tipusVia (copia adreca)');
check(result.caracteristiques.cups === 'ES0031405221001234AB', 'caracteristiques.cups');
check(result.caracteristiques.potenciaMax === '5.75', "caracteristiques.potenciaMax = '5.75'");
check(result.caracteristiques.tensio === '230 V', 'caracteristiques.tensio');
check(result.caracteristiques.us === '5', "caracteristiques.us = '5' (habitatges)");
check(result.caracteristiques.materialConductor === undefined, 'materialConductor: undefined (no dit)');
check(result.caracteristiques.subministramentComplementari === undefined, 'subministrament: undefined (no dit)');
check(result.caracteristiques.circuits === '', 'circuits: string buit (no cobert per Gemini encara)');

if (failed > 0) {
  console.error(`\n✗ ${failed} assertion(s) han fallat.`);
  process.exit(1);
}
console.log('\n✓ Tot OK. El mapper està llest per connectar-se al FormFillerService.');
