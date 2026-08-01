# Punt de situacio - Sentinel cover

Data: 2026-06-09

## Carpeta de treball

El projecte principal es treballa a:

```text
C:\Users\dave_\Sentinel cover
```

Es un checkout Git real del repo:

```text
https://github.com/damensa/Sentinel_cover
```

La branca local es `master` i segueix `origin/master`.

## Estat general

El projecte conte:

- Frontend/demo estatics a l'arrel: `index.html`, `script.js`, `styles.css`, `landing.html`, `landing.css`, `landing.js`.
- Motor i proves PDF/XFA a l'arrel: `fill_xfa.js`, `xfa_engine.js`, `test_fill.js`, `field_map.json`.
- Plantilles oficials a `Templates/`, separades per comunitat.
- Bot principal a `whatsapp-bot/`, escrit en TypeScript.

Hi ha fitxers locals ignorats que no s'han de pujar:

- `BOT/`, amb credencial local de Google.
- `manuals_calderas/`.
- PDFs grans de normativa: `BOE-*`, `UNE_60670.pdf`.
- PDFs/DOCX generats pel bot.
- `node_modules/`.
- `whatsapp-bot/dist/`.

La carpeta `_review_out/` segueix sense versionar. Sembla sortida d'una revisio anterior.

## Canvis fets avui

S'ha treballat sobretot a:

```text
whatsapp-bot/src/services/form-filler.ts
whatsapp-bot/src/whatsapp.ts
whatsapp-bot/src/worker.ts
whatsapp-bot/package.json
.gitignore
whatsapp-bot/src/scripts/smoke-catalunya-docs.ts
```

Canvis principals:

- `FormFillerService` ara calcula la ruta del projecte des del codi, no depen tant de `process.cwd()`.
- Les plantilles es resolen a `Templates/Catalunya`, `Templates/Arago`, `Templates/Comunitat Valenciana` i `Templates/Comunidad de Madrid`.
- Els fitxers generats surten a `whatsapp-bot/`.
- Catalunya `ELEC1` ara usa `ELEC1_AcroForm.pdf`, que es el PDF que realment exposa camps AcroForm.
- S'ha corregit el nom de la Declaracio Responsable:
  - Abans: `DeclaracioResponsableInstallatcio.pdf`
  - Ara: `DeclaracioResponsableInstallacio.pdf`
- La Declaracio Responsable de Catalunya ara s'omple via injeccio XFA basica.
- `ELEC2` ara rep la regio i carrega la plantilla regional.
- `whatsapp.ts` i `worker.ts` passen la regio a `fillElec2PDF`.
- S'ha afegit el script:

```text
npm run smoke:catalunya-docs
```

## Verificacio feta

S'han instal.lat dependencies a `whatsapp-bot/` amb:

```powershell
npm install --legacy-peer-deps
```

Motiu: `npm install` normal falla per conflicte de peer dependency entre `openai@6.17.0` i `zod@3.24.1`.

Compilacio:

```powershell
npm run build
```

Resultat: OK.

Smoke test Catalunya:

```powershell
npm run smoke:catalunya-docs
```

Resultat: OK.

Documents generats correctament:

- `CATALUNYA_ELEC1_filled_....pdf`
- `CATALUNYA_DR_filled_....pdf`
- `CATALUNYA_ContracteBT_filled_....pdf`
- `ELEC2_filled_....pdf`
- `ELEC3_filled_....docx`
- `DICTAMEN_filled_....docx`

També s'ha verificat que els documents contenen dades reals de prova:

- ELEC1 conte `Joan Garcia Puig` i el CUPS.
- Contracte conte nom, NIF i potencia.
- DR XFA conte nom, NIF i CUPS.
- ELEC3 conte nom, poblacio i distribuadora.
- Dictamen conte nom, poblacio i expedient.

## Estat dels documents de Catalunya

### ELEC1

Estat: verificat amb smoke test.

Punt important: el fitxer `ELEC1CertificatInstalElectricaBT.pdf` es XFA i no exposa camps AcroForm via `pdf-lib`. El fitxer correcte per al bot es:

```text
Templates/Catalunya/ELEC1_AcroForm.pdf
```

### Declaracio Responsable

Estat: genera PDF i injecta dades XFA basiques.

S'ha comprovat que hi entren nom, NIF i CUPS.

Pendent: ampliar el mapatge XFA si calen mes camps que els detectats actualment.

### Contracte Manteniment BT

Estat: verificat amb smoke test.

El PDF te camps AcroForm i el codi omple els camps principals.

### ELEC2

Estat: genera PDF.

No es un formulari amb camps; el bot dibuixa text sobre la plantilla amb coordenades.

Pendent: revisar visualment el PDF generat per assegurar que el text cau al lloc correcte.

### ELEC3

Estat: genera DOCX.

La plantilla `MemoriaTecnicaELEC3.docx` te placeholders i el test confirma dades dins el DOCX.

Pendent: revisio visual del DOCX final.

### Dictamen

Estat: genera DOCX.

El test confirma dades basiques dins el DOCX.

Pendent important: la plantilla sembla tenir menys placeholders dels que el codi intenta omplir per als 42 punts d'inspeccio. Cal revisar visualment si el checklist queda complet o si nomes s'omple parcialment.

## Pendents recomanats per dema

1. Obrir visualment els 6 documents generats pel smoke test i comprovar layout.
2. Revisar especialment `ELEC2_filled_....pdf`, per coordenades.
3. Revisar especialment `DICTAMEN_filled_....docx`, per placeholders del checklist.
4. Si tot es veu be, provar el flux real per WhatsApp amb `!regio catalunya`.
5. Afegir un README curt del bot amb:
   - `npm install --legacy-peer-deps`
   - `npm run build`
   - `npm run smoke:catalunya-docs`
   - `npm run bot`
6. Decidir que fer amb `_review_out/`: ignorar-lo o esborrar-lo si no serveix.
7. Revisar vulnerabilitats npm quan el flux funcional ja estigui estabilitzat.

## Com continuar rapid

Des de PowerShell:

```powershell
cd "C:\Users\dave_\Sentinel cover\whatsapp-bot"
npm run build
npm run smoke:catalunya-docs
```

Per provar WhatsApp:

```powershell
npm run bot
```

Despres, al xat de WhatsApp:

```text
!regio catalunya
Vull fer l'ELEC1
```

