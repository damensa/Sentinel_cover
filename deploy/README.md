# Desplegar Sentinel al VPS (Ubuntu + Docker + Caddy)

Instruccions concretes per posar la PWA de veu funcionant a
`https://sentinel.tusecre.online/`, coexistint amb la resta de projectes
que ja hi ha al VPS. Totes les comandes són per copiar-enganxar; **cap
canvi al VPS s'ha fet encara**.

## Estat del VPS que dono per fet

Verificat abans d'escriure aquest doc:

- Ubuntu 24.04 LTS a `82.223.107.46`
- Node 22.22 + npm 10.9 al host (perfecte)
- Git, curl, certbot, Docker, UFW (inactiu)
- Ports 80/443 ocupats pel contenidor `tusecre-caddy-1` (Caddy) → **serà el nostre reverse proxy**
- Caddyfile a `/opt/tusecre/Caddyfile`
- Docker compose de tusecre a `/opt/tusecre/docker-compose.yml`
- **Port 3001 lliure** — el gateway s'hi escoltarà

Convenció que segueixen els altres subdominis: el bloc de Caddy fa
`reverse_proxy 172.17.0.1:PORT` per arribar al host (172.17.0.1 és el
pont Docker).

---

## Pas 0 — DNS (has de fer-ho tu al registrador)

Al panell DNS de `tusecre.online`, afegeix un registre:

```
Tipus: A
Nom:   sentinel
Valor: 82.223.107.46
TTL:   300  (o el default)
```

Verifica que ha propagat (des del teu PC o el VPS):

```bash
getent hosts sentinel.tusecre.online
# hauria de retornar 82.223.107.46
```

Sense DNS propagat, Caddy no aconseguirà el certificat de Let's Encrypt.

---

## Pas 1 — Clonar el codi al VPS

```bash
ssh -i ~/.ssh/id_ed25519_vps_openclaw root@82.223.107.46
```

Al VPS:

```bash
cd /opt
git clone https://github.com/damensa/Sentinel_cover.git sentinel
cd sentinel
```

## Pas 2 — Instal·lar i compilar

Backend (gateway):

```bash
cd /opt/sentinel/whatsapp-bot
npm install --legacy-peer-deps
```

Frontend (PWA compilada):

```bash
cd /opt/sentinel/pwa
npm install
npm run build
# genera pwa/dist/, que el gateway servirà com a estàtics
```

## Pas 3 — Configurar el `.env` del gateway

```bash
cd /opt/sentinel/whatsapp-bot
cp .env.example .env
# Genera un token nou:
openssl rand -hex 32
# copia el resultat i edita .env
nano .env
```

Al `.env` cal com a mínim:

```
GEMINI_API_KEY=AIzaSy...          # la teva clau de Google AI Studio
GATEWAY_ACCESS_TOKEN=abc123def...  # el random que has generat
GATEWAY_PORT=3001
# Les altres vars poden quedar per defecte
```

Restringeix permisos perquè cap altre usuari pugui llegir-lo:

```bash
chmod 600 /opt/sentinel/whatsapp-bot/.env
```

## Pas 4 — Provar el gateway a mà

Abans d'engegar systemd, comprova que arrenca:

```bash
cd /opt/sentinel/whatsapp-bot
./node_modules/.bin/ts-node --transpile-only src/gateway/server.ts
```

Ha de dir:

```
[gateway] serving PWA from /opt/sentinel/pwa/dist
Gateway escoltant a http://localhost:3001
  ...
  API key OK
  Access token OK (endpoints protegits)
```

Des d'un altre terminal SSH:

```bash
curl -s http://127.0.0.1:3001/health
# {"ok":true,"hasKey":true,"hasToken":true,"port":3001}
```

`Ctrl+C` per aturar-lo. Si tot ha anat bé, seguim amb systemd.

## Pas 5 — systemd unit

```bash
cp /opt/sentinel/deploy/sentinel-gateway.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now sentinel-gateway
systemctl status sentinel-gateway --no-pager
```

Segueix els logs en directe:

```bash
journalctl -u sentinel-gateway -f
```

Un cop actiu, el gateway aguantarà reinicis del servidor i es reiniciarà
sol si peta.

## Pas 6 — Afegir el bloc a Caddy

Fes una còpia de seguretat del Caddyfile actual:

```bash
cp /opt/tusecre/Caddyfile /opt/tusecre/Caddyfile.backup.$(date +%Y%m%d)
```

Afegeix el bloc de Sentinel al final:

```bash
cat /opt/sentinel/deploy/Caddyfile.snippet >> /opt/tusecre/Caddyfile
```

O edita a mà i afegeix:

```
sentinel.tusecre.online {
 reverse_proxy 172.17.0.1:3001
}
```

Recarrega Caddy sense downtime dels altres subdominis:

```bash
docker exec tusecre-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Els logs de Caddy mostraran l'obtenció del certificat:

```bash
docker logs tusecre-caddy-1 --tail 30
```

Cerca "certificate obtained" o similar per a `sentinel.tusecre.online`.

## Pas 7 — Provar-ho des de fora

```bash
curl -s https://sentinel.tusecre.online/health
# {"ok":true,"hasKey":true,"hasToken":true,"port":3001}
```

Sense token, `/session` ha de fer 403:

```bash
curl -sw "HTTP %{http_code}\n" -X POST https://sentinel.tusecre.online/session \
  -H 'content-type: application/json' \
  -d '{"region":"catalunya","docType":"elec1"}'
# {"error":"forbidden: token invàlid o absent"}HTTP 403
```

Amb token:

```bash
curl -sw "HTTP %{http_code}\n" -X POST https://sentinel.tusecre.online/session \
  -H 'content-type: application/json' \
  -H "x-sentinel-token: EL_TOKEN_DEL_ENV" \
  -d '{"region":"catalunya","docType":"elec1"}'
# {"sessionId":"...","wsUrl":"/ws/..."}HTTP 200
```

## Pas 8 — Enviar-ho al teu amic

Format de l'enllaç:

```
https://sentinel.tusecre.online/?token=EL_TOKEN_DEL_ENV
```

Què hi ha de dir-li:

- Obrir-lo amb **Chrome o Edge al mòbil** (millor suport de mic i PWA).
- Acceptar el permís de micròfon.
- Pot fer "Afegir a pantalla d'inici" i s'obrirà com una app.
- El token queda desat al navegador, no cal reenganxar-lo cada vegada.

---

## Actualitzar més endavant

Quan hi hagi canvis al repo:

```bash
cd /opt/sentinel
git pull
cd whatsapp-bot && npm install --legacy-peer-deps
cd ../pwa && npm install && npm run build
systemctl restart sentinel-gateway
# El Caddy no cal reiniciar (només si canvia el Caddyfile).
```

## Depuració ràpida

| Símptoma | Comanda |
|---|---|
| Gateway no arrenca | `journalctl -u sentinel-gateway -n 100 --no-pager` |
| Caddy no dóna certificat | `docker logs tusecre-caddy-1 --tail 100` |
| DNS no resol | `dig sentinel.tusecre.online +short` |
| Verificar port lliure | `ss -tlnp \| grep 3001` |
| Reiniciar gateway | `systemctl restart sentinel-gateway` |
| Recarregar Caddy | `docker exec tusecre-caddy-1 caddy reload --config /etc/caddy/Caddyfile` |

## Fer marxa enrere (rollback)

Si vols desmuntar-ho tot:

```bash
systemctl disable --now sentinel-gateway
rm /etc/systemd/system/sentinel-gateway.service
systemctl daemon-reload

# Restaura el Caddyfile
cp /opt/tusecre/Caddyfile.backup.* /opt/tusecre/Caddyfile
docker exec tusecre-caddy-1 caddy reload --config /etc/caddy/Caddyfile

# Opcional: esborra el codi
rm -rf /opt/sentinel
```

Cap altre projecte del VPS es toca.
