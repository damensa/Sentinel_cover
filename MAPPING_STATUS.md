# Estat de Mapeig dels Documents PDF (SentinelCover)

Aquest document detalla les accions realitzades de diagnòstic i l'anàlisi exhaustiva de l'estructura del projecte **SentinelCover**, revisant les carpetes de plantilles regionals (`Templates/`) i els fitxers de configuració JSON de mapeig (`field_map.json` i els mapeigs regionals).

## Accions de Diagnòstic i Anàlisi Realitzades
* Listed directory Sentinel%20cover
* Listed directory Templates
* Viewed field_map.json:1-148
* Listed directory Catalunya
* Listed directory Arago
* Listed directory Comunidad%20de%20Madrid
* Listed directory Comunitat%20Valenciana
* Searched for "templates"
* Searched for ".pdf"
* Viewed xfa_engine.js:1-109
* Viewed fill_xfa.js:1-84
* Viewed index.html:1-390
* Viewed script.js:1-216
* Viewed test_fill.js:1-32
* Viewed arago_field_map.json:1-103
* Viewed madrid_field_map.json:1-34
* Viewed valencia_field_map.json:1-36

---

## Estat del Mapeig per Comunitats Autònomes

### 1. Catalunya (`Templates/Catalunya/` i arrel)
El mapeig principal per a Catalunya es troba al fitxer **`field_map.json`** de l'arrel del projecte (corresponent al model ELEC1).

| Document PDF / Plantilla | Estat | Fitxer de Mapeig | Notes |
| :--- | :---: | :--- | :--- |
| **`ELEC1CertificatInstalElectricaBT.pdf`** | ✅ **Mapejat** | `field_map.json` (arrel) | Model oficial de certificat d'instal·lació elèctrica en BT. |
| `Contracte Manteniment BT - Editable.pdf` / `ContracteMantenimentBT.pdf` | ❌ **Faltant** | — | Contracte de manteniment de Baixa Tensió. |
| `DeclaracioResponsableInstallacio.pdf` | ❌ **Faltant** | — | Declaració responsable de la instal·lació. |
| `EsquemaUnifilarELEC2.pdf` | ❌ **Faltant** | — | Esquema unifilar associat. |
| `ELEC1_AcroForm.pdf` | ❌ **Faltant** | — | Una altra variant del certificat en format AcroForm. |
| *`MemoriaTecnicaELEC3.doc` / `DICTAMEN DE RECONEIXEMENT...doc`* | ⚠️ *No PDF* | — | Són fitxers de Word (`.doc`/`.docx`). Caldria convertir-los a PDF editable abans de poder mapejar-los. |

---

### 2. Aragó (`Templates/Arago/`)
El mapeig d'aquesta comunitat es troba al fitxer **`Templates/Arago/arago_field_map.json`**.

| Document PDF / Plantilla | Estat | Fitxer de Mapeig | Notes |
| :--- | :---: | :--- | :--- |
| **`E0001_v5_fillable.pdf`** | ✅ **Mapejat** | `arago_field_map.json` | Correspondència amb els camps `"E0001"`. |
| **`C0004_v3_fillable.pdf`** | ✅ **Mapejat** | `arago_field_map.json` | Correspondència amb els camps `"C0004"`. |
| **`C0001_v2_3_fillable.pdf`** | ✅ **Mapejat** | `arago_field_map.json` | Correspondència amb els camps `"C0001"`. |
| `C0002_v2_2_fillable.pdf` | ❌ **Faltant** | — | Plantilla de certificat en format PDF editable. |
| `C0003_v2_2_fillable.pdf` | ❌ **Faltant** | — | Plantilla de certificat en format PDF editable. |
| *`C0001_..._DIAGNOSTIC.pdf` / `anx02_..._TABLA_1.pdf`* | ⚠️ *Exclòs* | — | Són PDF auxiliars o de diagnòstic, no estan destinats a ser omplerts de dades. |

---

### 3. Comunidad de Madrid (`Templates/Comunidad de Madrid/`)
El mapeig d'aquesta comunitat es troba al fitxer **`Templates/Comunidad de Madrid/madrid_field_map.json`**.

| Document PDF / Plantilla | Estat | Fitxer de Mapeig | Notes |
| :--- | :---: | :--- | :--- |
| **`DHHBWA_fillable.pdf`** (i còpies `(1)`, `(2)`) | ✅ **Mapejat** | `madrid_field_map.json` | Correspondència amb `"DHHBWA_fillable"`. |
| `IMPRE2722.pdf` | ❌ **Faltant** | — | Formulari de registre de la Comunitat de Madrid. |
| `solicitud_bt_generica_dgteyec_15042024.pdf` | ❌ **Faltant** | — | Sol·licitud genèrica de BT. |
| *`DHHBWA.pdf` / `DHHBWA.xls`* | ⚠️ *Exclòs* | — | Són el PDF original (no editable/no fillable) i el full d'excel de suport. |

---

### 4. Comunitat Valenciana (`Templates/Comunitat Valenciana/`)
El mapeig d'aquesta comunitat es troba al fitxer **`Templates/Comunitat Valenciana/valencia_field_map.json`**.

| Document PDF / Plantilla | Estat | Fitxer de Mapeig | Notes |
| :--- | :---: | :--- | :--- |
| **`23294_BI.pdf`** | ✅ **Mapejat** | `valencia_field_map.json` | Correspondència amb `"23294_BI"`. |
| **`23019_BI.pdf`** | ✅ **Mapejat** | `valencia_field_map.json` | Correspondència amb `"23019_BI"`. |
| `23094_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `23165_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `23167_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `23168_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `23281_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `23293_BI.pdf` | ❌ **Faltant** | — | Butlletí/formulari oficial valencià en PDF. |
| `PR440_es_amp.pdf` | ❌ **Faltant** | — | Sol·licitud d'ampliació/modificació. |

---

### Resum de l'estat global
* **PDFs Mapejats i Funcionals:** **7 documents** (ELEC1 a Catalunya, C0001, C0004 i E0001 a Aragó, DHHBWA a Madrid, i 23294 i 23019 a València).
* **PDFs Pendents de Mapejar:** **15 documents** (repartits entre la Comunitat Valenciana, Madrid, Catalunya i els pendents de l'Aragó).
