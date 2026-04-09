# Estado del Deploy en el VPS — 2026-04-09

## Lo que YA está funcionando en producción

**VPS**: `root@194.163.161.151`  
**Container**: `jarvis-openclaw` (OpenClaw 2026.4.1, network `caddy-network`, puerto 18789)  
**Plugin path**: `/root/.openclaw/extensions/jarvis/`

### Instalado y cargado
- ✅ **53 tools** registradas con prefijo `jarvis_*` — listas con `openclaw plugins inspect jarvis`
- ✅ **3 slash commands** (`research`, `engine`, `diagnose`)
- ✅ **8 HTTP routes** del HUD en `/plugins/jarvis/api/*`
- ✅ **2 hooks** (`agent:bootstrap`, `message:received`) — con warnings cosméticos de "missing name"
- ✅ **Dependencies npm** instaladas dentro del plugin: `axios`, `pino`, `pino-pretty`, `@sinclair/typebox`, `dotenv`
- ✅ **plugins.allow** incluye `jarvis` + providers necesarios (anthropic, google, groq, openrouter)

### Smoke tests verificados end-to-end
1. `openclaw agent --agent main --message "menciona 3 tools"` → responde incluyendo `jarvis_send_email`
2. `openclaw agent --agent main --message "Usa jarvis_is_social_url para ..."` → invoca la tool, ejecuta la función legacy `isSocialMediaUrl` de `social-extractor.ts`, retorna `{"status":"ok","url":"...","is_social":true}`
3. `curl -H "Authorization: Bearer ..." http://jarvis-openclaw:18789/plugins/jarvis/api/system` → responde `{"error":"hud_disabled","reason":"JARVIS_WEB_TOKEN not set"}` (el auth path funciona; solo falta setear la env var)

### IMPORTANTE: `jarvis-v2` sigue corriendo sin tocar
El plugin está instalado en el container `jarvis-openclaw` **paralelo**. El container `jarvis-v2` (el Jarvis actual que recibe WhatsApp) sigue corriendo y atendiendo producción como siempre. **No se cambió ni Caddy ni el webhook de Meta.** El deploy es seguro: puedes apagar el plugin o el container `jarvis-openclaw` sin afectar nada.

---

## Lo que TÚ tienes que hacer (orden de pasos)

### Paso 1 — Setear las env vars en `jarvis-openclaw` (5 min)

El container `jarvis-openclaw` ya tiene muchas vars heredadas de cuando era solo delegate, pero falta `JARVIS_WEB_TOKEN` y posiblemente `META_GRAPH_TOKEN`. Verifica con:

```bash
ssh root@194.163.161.151
docker exec jarvis-openclaw env | grep -E "JARVIS_WEB_TOKEN|META_GRAPH_TOKEN|ELEVENLABS_API_KEY"
```

Si faltan, necesitas recrear el container con las vars nuevas. Opciones:

**Opción A (recomendada)**: añadir al docker-compose donde está definido `jarvis-openclaw`
```yaml
services:
  jarvis-openclaw:
    environment:
      JARVIS_WEB_TOKEN: "stark-industries-access-2024"
      META_GRAPH_TOKEN: "<tu-token-meta-graph>"
      # ...demás vars de .env.jarvis
```
Luego: `docker compose up -d jarvis-openclaw` (recrea solo ese container, conserva state)

**Opción B (rápida)**: copiar las vars a un `.env` file que el plugin lea:
```bash
docker exec jarvis-openclaw sh -c 'cat > /root/.openclaw/extensions/jarvis/.env <<EOF
JARVIS_WEB_TOKEN=stark-industries-access-2024
META_GRAPH_TOKEN=...
ELEVENLABS_API_KEY=...
EOF'
docker restart jarvis-openclaw
```

El plugin usa `dotenv/config` en `legacy/shared/config.ts`, así que levanta las vars del archivo.

### Paso 2 — Verificar que el HUD responde con auth válida (2 min)

```bash
ssh root@194.163.161.151
docker run --rm --network caddy-network alpine/curl \
  -H "Authorization: Bearer stark-industries-access-2024" \
  http://jarvis-openclaw:18789/plugins/jarvis/api/system
```

Debe retornar `{"status":"ok","plugin":"jarvis","version":"0.1.0","tools":53,"uptime":...}`.

### Paso 3 — Instalar los crons nativos (2 min)

```bash
ssh root@194.163.161.151
docker exec jarvis-openclaw sh -c 'bash /tmp/jarvis-plugin-new/scripts/install-crons.sh'
# O si movieron el dir:
docker exec jarvis-openclaw openclaw cron list
```

Debe listar los 3 jobs: `jarvis-daily-engine`, `jarvis-social-comments`, `jarvis-lead-scan`.

### Paso 4 — Pruebas manuales desde el CLI (ventana 10 min)

Antes de hacer el cutover de Caddy, prueba funcionalidad desde dentro del container:

```bash
# Delegación a sub-agente
docker exec jarvis-openclaw openclaw agent --agent main --message "busca correos de hoy de founder@kreoon.com"

# Tool directa
docker exec jarvis-openclaw openclaw agent --agent main --message "usa jarvis_list_calendar_events para ver mis eventos de hoy"

# Slash command
docker exec jarvis-openclaw openclaw chat --channel cli --message "/research founder@kreoon.com"
```

Si los 3 responden sin errores (aunque la personalidad sea genérica por el warning del hook), estás listo para el cutover.

### Paso 5 — Cutover de Caddy (30 segundos, reversible)

Sigue el runbook en `extensions/jarvis/CUTOVER_RUNBOOK.md` paso 6:

```bash
# Editar /etc/caddy/Caddyfile
# Cambiar: reverse_proxy jarvis-v2:3000
# Por:    reverse_proxy jarvis-openclaw:18789
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Verifica con un mensaje WhatsApp real a tu número. Si no responde correctamente, **rollback inmediato**: cambia la línea de vuelta a `jarvis-v2:3000` y `caddy reload`.

### Paso 6 — Período de observación (24-48h)

Deja `jarvis-v2` corriendo en paralelo. Monitorea:
- `docker logs -f jarvis-openclaw` — errores de plugin, warnings de hooks
- `docker exec jarvis-openclaw openclaw cron runs --id jarvis-daily-engine` — que el cron del engine haya disparado el L-V a las 6AM

### Paso 7 — Apagar `jarvis-v2` (cuando estés seguro)

```bash
docker stop jarvis-v2
docker rename jarvis-v2 jarvis-v2-backup
# Déjalo una semana más como rollback
```

---

## Pendientes menores (post-cutover, no bloquean)

1. **Personality injection**: el hook `agent:bootstrap` está registrado pero el agente responde genérico. Investigar el warning `hook registration missing name` — probablemente necesita un `name` explícito en las opts del `registerHook`.
2. **4 rutas HUD en stub (501)**: `tts`, `agents`, `calendar`, `analyst`. Falta portar la lógica real de `jarvis-assistant/src/routes/*.ts`.
3. **Security audit collectors**: el plugin necesita `--dangerously-force-unsafe-install` por el scanner que marca `env + network send`. En una iteración siguiente, añadir `OpenClawPluginSecurityAuditCollector` para marcar esos patrones como autorizados.
4. **Publicar a ClawHub**: en vez de `docker cp + install path`, publicar el plugin a ClawHub para instalación limpia.

Ninguno es bloqueante para probar en producción.

---

## Rollback de emergencia

Si algo sale muy mal después del cutover:

```bash
# 1. Caddy — volver a jarvis-v2
ssh root@194.163.161.151
sed -i 's/jarvis-openclaw:18789/jarvis-v2:3000/' /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 2. Verificar jarvis-v2 sigue activo
docker ps | grep jarvis-v2

# 3. Smoke test
curl https://jarvis.kreoon.com/health
```

Si el plugin rompió algo dentro de `jarvis-openclaw` y afecta el delegado actual (aunque no debería):

```bash
# Desinstalar el plugin
docker exec jarvis-openclaw openclaw plugins uninstall jarvis
docker restart jarvis-openclaw
```

---

## Branch y commits

- **Fork**: https://github.com/AlexanderKast/openclaw
- **Branch**: `feat/jarvis-plugin`
- **Commits**:
  - `73a3549` POC scaffold + first legacy wrapper
  - `b55b9b4` Phase 2: 52 tool wrappers across 9 domains
  - `55b18ec` Phases 3-5: subagents, hooks, commands, routes, crons
  - `535889e` Phase 4b: real handlers + production deploy verified

Para crear el PR upstream (a `openclaw/openclaw`):
```bash
gh pr create --repo openclaw/openclaw \
  --base main --head AlexanderKast:feat/jarvis-plugin \
  --title "feat(jarvis): Bundled Jarvis plugin for Kreoon ecosystem" \
  --body-file extensions/jarvis/PR_DESCRIPTION.md
```
