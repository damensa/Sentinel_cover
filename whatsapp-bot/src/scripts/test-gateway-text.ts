// Test end-to-end del gateway via canal de text (evita necessitar micròfon).
// Prova la mateixa conversa validada al 2026-08-01, però amb missatges escrits
// en comptes de veu. Confirma que:
//   1. POST /session crea una sessió i retorna sessionId.
//   2. La WS s'obre, es connecta a Gemini Live i rep l'opening.
//   3. Enviar text via {type:"text"} desencadena crides a save_elec1_fields.
//   4. El gateway acumula el JSON i l'envia com a field_update.
//   5. POST /session/:id/submit valida el JSON acumulat contra l'schema.
//
// Ús: primer arrenca el gateway (npx ts-node src/gateway/server.ts) en un
// terminal, després executa aquest script en un altre.

import WebSocket from 'ws';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3001';

// Mateixes frases que la validació manual al Real-time playground.
const PHRASES = [
  'El titular és Joan Garcia Puig amb DNI 46789012M.',
  "L'adreça és avinguda Diagonal 340, 3r 2a, codi postal 08037, Barcelona.",
  'CUPS ES 0031 4052 21 00 1234 AB. Potència 5,75 kW.',
  "L'ús és per a habitatge, monofàsic 230 volts.",
];

async function main(): Promise<void> {
  const createRes = await fetch(`${GATEWAY_URL}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region: 'catalunya', docType: 'elec1' }),
  });
  if (!createRes.ok) {
    throw new Error(`POST /session ${createRes.status}: ${await createRes.text()}`);
  }
  const { sessionId } = (await createRes.json()) as { sessionId: string };
  console.log(`✓ sessió creada: ${sessionId}`);

  const wsUrl = GATEWAY_URL.replace(/^http/, 'ws') + `/ws/${sessionId}`;
  const ws = new WebSocket(wsUrl);

  let lastFields: any = null;
  let phraseIdx = 0;
  let turnPending = false;

  const sendNextPhrase = (): void => {
    if (phraseIdx >= PHRASES.length) return;
    const phrase = PHRASES[phraseIdx++];
    console.log(`\n▶  [${phraseIdx}/${PHRASES.length}] ${phrase}`);
    ws.send(JSON.stringify({ type: 'text', text: phrase }));
    turnPending = true;
  };

  ws.on('open', () => {
    console.log('✓ WS connectada');
  });

  ws.on('message', (data) => {
    let evt: any;
    try { evt = JSON.parse(data.toString('utf8')); }
    catch { return; }

    switch (evt.type) {
      case 'model_text':
        console.log('   Gemini (text):', evt.text);
        break;
      case 'model_audio':
        // Ignorem l'àudio de resposta en el CLI (només es faria servir a la PWA).
        break;
      case 'field_update':
        lastFields = evt.fields;
        console.log('   ⇐ field_update (delta):', JSON.stringify(evt.delta));
        break;
      case 'turn_complete':
        if (turnPending) {
          turnPending = false;
          if (phraseIdx < PHRASES.length) {
            setTimeout(sendNextPhrase, 400);
          } else {
            setTimeout(finish, 600);
          }
        }
        break;
      case 'error':
        console.error('   ✗ error:', evt.message);
        break;
      case 'session_end':
        console.log('   (session_end)');
        break;
      default:
        console.log('   evt:', evt.type);
    }
  });

  const finish = async (): Promise<void> => {
    console.log('\n=== Estat final acumulat ===');
    console.log(JSON.stringify(lastFields, null, 2));

    const submitRes = await fetch(`${GATEWAY_URL}/session/${sessionId}/submit`, {
      method: 'POST',
    });
    const body = await submitRes.json();
    console.log('\n=== Validació final ===');
    console.log(JSON.stringify(body, null, 2));

    ws.close();
    process.exit(submitRes.ok ? 0 : 1);
  };

  ws.on('error', (e) => {
    console.error('WS error:', e);
    process.exit(1);
  });

  // El gateway envia l'opening automàticament; esperem que arribi turn_complete
  // abans d'enviar la primera frase.
  ws.once('message', () => {
    setTimeout(sendNextPhrase, 1200);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
