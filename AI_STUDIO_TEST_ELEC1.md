# Prova ràpida a Google AI Studio — ELEC1 per veu

Branca: `feature/pwa-veu-instalador`
Objectiu: validar en 15 minuts que Gemini 2.5 Flash Live entén una conversa en català i omple els camps d'ELEC1 correctament, abans que construïm el gateway i la PWA.

Si aquesta prova va bé, tirem endavant amb la implementació. Si detectes problemes, els arreglem al schema o al system prompt abans d'invertir hores de codi.

## 1. Obre el playground correcte

1. Vés a https://aistudio.google.com/
2. A l'esquerra: **"Stream Realtime"** (també apareix com **"Live"** segons versió).
3. A la dreta, al panell de configuració:
   - **Model**: `gemini-2.5-flash` (o el més recent de la família Flash Live).
   - **System instructions**: enganxa el bloc de la §2 més avall.
   - **Tools** → **Function calling**: enganxa la declaració de la §3 més avall.
   - **Response modality**: `Audio` (perquè Gemini respongui parlat, com farà a la PWA).
   - **Voice**: qualsevol femenina o masculina; per veure com sona en català prova `Aoede` o `Kore`.
   - **Language** (si el playground ho demana): `Catalan (ca-ES)`.

## 2. System instructions (enganxa tal qual)

```text
Ets l'assistent de veu de Sentinel per omplir el certificat ELEC1 de baixa
tensió a Catalunya. L'instal·lador et parlarà en català (pot barrejar
castellà) mentre inspecciona una obra. Sovint tindrà soroll de fons.

La teva feina:
- Escolta el que diu i crida la funció save_elec1_fields amb els camps
  que hagis entès. Retorna només els camps nous o modificats, no repeteixis
  els que ja s'han guardat en cridades anteriors.
- Respon en veu de forma curta i natural. Per als camps normals digues
  només "anotat" o "continua". Per als camps crítics (titular, NIF, CUPS,
  potència i adreça) confirma verbalment el que has entès, per exemple:
  "He anotat CUPS acabat en A B, correcte?".
- No inventis mai. Si un camp no s'ha dit clarament, deixa'l buit i, si
  cal, demana-ho.
- Si l'usuari diu una unitat diferent (W, VA), converteix a kW.
- Si diu "C/" assumeix "Carrer"; "Ctra." → "Carretera"; "Av." → "Avinguda".
- Per als camps crítics, omple també _confidence amb "alta", "mitjana" o
  "baixa" segons com de segur estiguis del que has entès.

Comença tu la conversa amb: "Comencem l'ELEC1. Digues-me el nom del titular
i el DNI quan vulguis."
```

## 3. Function declaration (enganxa tal qual)

És el nostre `elec1.schema.json` **bundlejat**: els `$ref` a `_shared.json` s'han inlinat i s'ha tret el que Gemini no accepta (`$schema`, `$id`, `pattern` estricte). Els `_confidence` també inlinats.

Nota: AI Studio espera un **array** de declaracions (perquè admet més d'una funció alhora). Enganxa el bloc tal qual, amb `[` i `]`.

```json
[{
  "name": "save_elec1_fields",
  "description": "Guarda o actualitza els camps del certificat ELEC1 amb el que l'instal·lador ha dit. Cada crida ha de contenir només els camps nous o modificats des de l'última crida.",
  "parameters": {
    "type": "object",
    "properties": {
      "titular": {
        "type": "object",
        "description": "Persona titular de la instal·lació.",
        "properties": {
          "nom_complet": { "type": "string", "description": "Nom i cognoms tal com surten al DNI." },
          "nif": { "type": "string", "description": "NIF (8 dígits + lletra) o NIE (X/Y/Z + 7 dígits + lletra)." },
          "telefon": { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "emplacament": {
        "type": "object",
        "description": "Adreça de la instal·lació.",
        "properties": {
          "tipus_via": {
            "type": "string",
            "enum": ["Carrer", "Avinguda", "Passeig", "Plaça", "Ronda", "Camí", "Carretera", "Travessia", "Urbanització", "Polígon", "Altra"]
          },
          "nom_via": { "type": "string" },
          "num_via": { "type": "string", "description": "Pot contenir lletra o s/n." },
          "bloc": { "type": "string" },
          "escala": { "type": "string" },
          "pis": { "type": "string" },
          "porta": { "type": "string" },
          "codi_postal": { "type": "string", "description": "5 dígits." },
          "poblacio": { "type": "string" },
          "comarca": { "type": "string" },
          "provincia": { "type": "string" }
        }
      },
      "instalacio": {
        "type": "object",
        "description": "Característiques tècniques.",
        "properties": {
          "cups": { "type": "string", "description": "Codi CUPS de 22 caràcters, comença per ES." },
          "potencia_kw": { "type": "number", "description": "Potència contractada en kW." },
          "tensio": { "type": "string", "enum": ["230 V", "3x230/400 V", "Altra"] },
          "material_conductor": { "type": "string", "enum": ["Coure", "Alumini"] },
          "ubicacio_comptadors": { "type": "string", "enum": ["Sala", "Armari", "Altra"] },
          "tipus_connexio": { "type": "string", "enum": ["Assistida", "Interconnectada"] },
          "categoria": { "type": "string", "enum": ["Bàsica", "Especialista"] },
          "us": {
            "type": "string",
            "enum": [
              "Instal·lacions industrials",
              "Instal·lacions temporals per a obres",
              "Instal·lacions d'enllaç",
              "Instal·lacions de serveis comuns d'edificis",
              "Instal·lacions d'habitatges",
              "Locals d'espectacles",
              "Locals de reunió/treball/sanitaris",
              "Recàrrega de vehicles elèctrics",
              "Aparcaments",
              "Enllumenat exterior",
              "Generadores per autoconsum",
              "Oficines sense públic",
              "Generadores",
              "Altres usos"
            ]
          },
          "subministrament_complementari": { "type": "boolean" }
        }
      },
      "_confidence": {
        "type": "object",
        "description": "Nivell de confiança per als camps crítics. La UI marca en groc/vermell tot el que no sigui 'alta'.",
        "properties": {
          "nom_complet": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "nif": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "cups": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "potencia_kw": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "nom_via": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "num_via": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "poblacio": { "type": "string", "enum": ["alta", "mitjana", "baixa"] },
          "codi_postal": { "type": "string", "enum": ["alta", "mitjana", "baixa"] }
        }
      }
    }
  }
}]
```

## 4. Frases de prova (digues-les una a una, no de cop)

Prem el botó del micro, digues la frase, deixa que respongui, i mira el panell de dreta que mostra les crides a `save_elec1_fields`.

1. **Titular + NIF**
   > "El titular és Joan Garcia Puig, amb DNI quaranta-sis milions set-cents vuitanta-nou mil dotze, lletra M."

2. **Adreça amb abreviatures**
   > "L'obra és a l'avinguda Diagonal número tres-cents quaranta, tercer segona, codi postal zero vuit zero tres set, Barcelona."

3. **CUPS + potència (el més difícil)**
   > "CUPS ES zero zero tres u, quatre zero cinc dos, dos u zero zero, u dos tres quatre, A B. Potència cinc coma set cinc kilowatts."

4. **Ús + tensió + una correcció**
   > "És per a un habitatge, monofàsic dos-cents trenta volts. Ah espera, el nom del titular és Garcia i cognom Puig amb 'g' final, no amb 'ch'."

5. **Prova de conversió d'unitats**
   > "La potència són cinc mil set-cents cinquanta watts."

## 5. Què has de mirar

Per cada crida `save_elec1_fields` que faci Gemini, comprova:

- [ ] **Estructura correcta**: el JSON coincideix amb el schema (només camps nous, no repeteix).
- [ ] **NIF ben transcrit**: "46789012M" no "4678912M" ni "46789012 eme".
- [ ] **CUPS ben transcrit**: comprova cada bloc de 4 xifres i les 2 lletres finals.
- [ ] **Potència en kW**: si has dit "5750 watts", ha de sortir `5.75`, no `5750`.
- [ ] **Abreviatures resoltes**: `tipus_via` = "Avinguda", no "Av." ni "AVI".
- [ ] **Correcció respectada**: quan corregeixes el titular, la nova crida ha d'actualitzar el camp, no crear-ne un de duplicat.
- [ ] **Confirmació verbal**: Gemini repeteix el CUPS i NIF en veu ("acabat en A B, correcte?").
- [ ] **`_confidence` present**: almenys per CUPS i NIF, marca el nivell adient.

## 6. Què fer amb els resultats

Reporta'm de tornada:

- Si tot va bé: passem a implementar (punts 1-3 del pla).
- Si hi ha errors concrets, digues quins. Poden implicar:
  - Ajustar el system prompt (afegir exemples de números en xifra).
  - Canviar enums o descriptions al schema.
  - Considerar una capa de post-processament (per exemple, normalitzar el CUPS amb un regex al backend abans de validar).

Nota: aquest fitxer és **només per la prova manual**. No forma part del codi de producció; és documentació de la branca.
