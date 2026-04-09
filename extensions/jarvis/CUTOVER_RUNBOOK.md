# Fase 6 — Runbook de Cutover a Produccion

> **Este runbook DEBES ejecutarlo tu (Alexander) en el VPS 194.163.161.151**.
> No se puede automatizar porque toca infraestructura compartida, webhook de Meta
> y DNS/proxy de caddy.

## Prerequisitos

- [ ] Plugin `jarvis` ya mergeado a `AlexanderKast/openclaw` branch `feat/jarvis-plugin`
- [ ] `jarvis-assistant/` sigue corriendo en paralelo como fallback (container `jarvis-v2`)
- [ ] Tienes las env vars de produccion a la mano (WhatsApp, Google OAuth, CouchDB, etc.)
- [ ] Ventana de ~1 hora de baja tolerancia (en caso de rollback)

---

## Paso 1 — Build & deploy del fork de OpenClaw

```bash
ssh root@194.163.161.151
cd /opt
git clone --branch feat/jarvis-plugin https://github.com/AlexanderKast/openclaw.git openclaw-next
cd openclaw-next
pnpm install
pnpm build
```

## Paso 2 — Preparar env vars para el plugin

Crea `/opt/openclaw-next/.env.jarvis` con TODAS las vars que hoy usa `jarvis-assistant/.env`:

```bash
# WhatsApp
WHATSAPP_VERIFY_TOKEN=jarvis-kreoon-2024
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TOKEN=...
WHATSAPP_APP_SECRET=...

# LLM providers
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...

# Perplexity
PERPLEXITY_API_KEY=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://jarvis.kreoon.com/auth/google/callback
GOOGLE_REFRESH_TOKEN=...
GOOGLE_REFRESH_TOKEN_OPS=...

# CouchDB (Obsidian sync)
COUCHDB_URL=http://couchdb:5984
COUCHDB_USER=admin
COUCHDB_PASS=KreoonSync2024!
OBSIDIAN_DB=obsidian-vault

# Meta Ads
N8N_WEBHOOK_URL=...
META_ADS_ACCESS_TOKEN=...
META_ADS_ACCOUNT_ID=...
META_GRAPH_TOKEN=...

# GitHub
GITHUB_TOKEN=...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Web HUD
JARVIS_WEB_TOKEN=stark-industries-access-2024

# Apify (brand-researcher)
APIFY_API_TOKEN=...
```

## Paso 3 — Arrancar OpenClaw en un container paralelo

```bash
cd /opt/openclaw-next
# Usa el Dockerfile actual de openclaw o docker-compose del upstream
docker build -t openclaw-jarvis:next .
docker run -d \
  --name jarvis-openclaw-next \
  --network caddy-network \
  --env-file .env.jarvis \
  -v /opt/openclaw-next/data:/root/.openclaw \
  -p 18790:3000 \
  openclaw-jarvis:next
```

Verifica que arranco correctamente:
```bash
docker logs -f jarvis-openclaw-next
# Debe ver algo como: "[jarvis] plugin registered with 53 tools"
```

## Paso 4 — Instalar crons nativos

```bash
docker exec jarvis-openclaw-next bash /opt/openclaw-next/extensions/jarvis/scripts/install-crons.sh
docker exec jarvis-openclaw-next openclaw cron list
```

Debe listar 3 jobs: `jarvis-daily-engine`, `jarvis-social-comments`, `jarvis-lead-scan`.

## Paso 5 — Smoke test sin redirigir trafico

Envia un mensaje de prueba directo al nuevo container SIN pasar por Caddy todavia:
```bash
curl -X POST http://localhost:18790/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"573132947776","text":{"body":"hola"},"type":"text","id":"test-1","timestamp":"1234567890"}]}}]}]}'
```

Verifica en los logs que el plugin procesa el mensaje y delega correctamente a `jarvis-core`.

## Paso 6 — Cambiar Caddy (cutover)

Edita `/etc/caddy/Caddyfile` (o el archivo equivalente donde vive `jarvis.kreoon.com`):

```caddy
jarvis.kreoon.com {
    # ANTES: reverse_proxy jarvis-v2:3000
    reverse_proxy jarvis-openclaw-next:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
    }
}
```

Recarga Caddy:
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Paso 7 — Verificar webhook de Meta

El webhook de WhatsApp Cloud API sigue apuntando a `https://jarvis.kreoon.com/webhook`. **NO hay que cambiarlo** (solo verificarlo):

1. Ve a https://developers.facebook.com/apps/
2. Selecciona la app de Jarvis
3. WhatsApp > Configuration > Webhook
4. Verifica que la URL sea `https://jarvis.kreoon.com/webhook` y el verify token coincida con `WHATSAPP_VERIFY_TOKEN` del `.env.jarvis`
5. Click "Verify" — debe responder verde

## Paso 8 — Test end-to-end

Manda un mensaje de texto a tu numero de WhatsApp Business desde tu telefono:
- "hola" → debe responder en parcero
- "que tengo mañana en el calendario" → debe delegar a ops y leer Google Calendar
- "busca correos de hoy de founder@kreoon.com" → debe delegar a ops y listar emails
- "guarda esto en memoria: test cutover" → debe guardar en CouchDB/filesystem

Si todo responde correctamente, el cutover esta OK. Deja correr **24-48h** con `jarvis-v2` apagado pero sin borrarlo.

## Paso 9 — Apagar jarvis-v2

Despues de 24-48h sin incidencias:
```bash
docker stop jarvis-v2
docker rename jarvis-v2 jarvis-v2-backup
# Dejalo asi una semana mas como rollback de emergencia
```

## Paso 10 — Rename del container nuevo

```bash
docker stop jarvis-openclaw-next
docker rename jarvis-openclaw-next jarvis
docker start jarvis
# Actualiza Caddy para apuntar a 'jarvis' en vez de 'jarvis-openclaw-next'
```

---

## ROLLBACK (si algo sale mal)

```bash
# 1. Revertir Caddy
sed -i 's/jarvis-openclaw-next/jarvis-v2/g' /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 2. Verificar que jarvis-v2 sigue activo
docker ps | grep jarvis-v2

# 3. Smoke test con el viejo
curl https://jarvis.kreoon.com/health
```

Rollback completo en < 2 minutos. Investiga la causa del fallo antes de reintentar.

---

## Post-cutover (Fase 7 — cleanup)

Solo despues de 1 semana estable:
1. Eliminar container `jarvis-v2-backup`
2. En `jarvis-assistant/` limpiar `src/`:
   - Borrar `src/core/` completo
   - Borrar `src/agents/` completo
   - Borrar `src/connectors/openclaw.ts`
   - Borrar `src/server.ts` y `src/routes/`
   - Dejar solo lo que aun sea util (scripts Python de debug, utilidades)
3. Archivar el repo `jarvis-assistant` como solo-lectura
4. Actualizar `CLAUDE.md` documentando la nueva arquitectura
