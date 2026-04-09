#!/usr/bin/env bash
# Fase 5 — Crons nativos de Jarvis
#
# Ejecutar una vez en el VPS despues de instalar el plugin jarvis:
#   chmod +x scripts/install-crons.sh
#   ./scripts/install-crons.sh
#
# Verifica con:
#   openclaw cron list
#
# Reemplaza el scheduler antiguo de jarvis-assistant/src/core/scheduler.ts
# que registraba estos 3 jobs manualmente con node-cron.

set -euo pipefail

TZ_BOGOTA="America/Bogota"
SESSION="isolated"
ANNOUNCE_CHANNEL="${JARVIS_ANNOUNCE_CHANNEL:-whatsapp}"
OWNER_PHONE="${OWNER_PHONE:-573132947776}"

echo "[jarvis] Instalando crons nativos en OpenClaw..."

# --- 1. Daily Content Engine (L-V 6AM Bogota) ---
openclaw cron add \
  --name "jarvis-daily-engine" \
  --cron "0 6 * * 1-5" \
  --tz "${TZ_BOGOTA}" \
  --session "${SESSION}" \
  --message "Ejecuta el motor de contenido diario usando jarvis_web_search para tendencias y jarvis_read_emails para newsletters. Genera 3 ideas de contenido con hooks." \
  --announce \
  --channel "${ANNOUNCE_CHANNEL}" \
  --to "${OWNER_PHONE}"

# --- 2. Social Comment Scanner (cada 30 min) ---
openclaw cron add \
  --name "jarvis-social-comments" \
  --cron "*/30 * * * *" \
  --session "${SESSION}" \
  --message "Usa jarvis_get_pending_comments para revisar comentarios pendientes en las 7 cuentas de IG. Si encuentras mas de 5, notifica al owner." \
  --announce \
  --channel "${ANNOUNCE_CHANNEL}" \
  --to "${OWNER_PHONE}"

# --- 3. Lead Hunter Daily Scan (L-V 7AM Bogota) ---
openclaw cron add \
  --name "jarvis-lead-scan" \
  --cron "0 7 * * 1-5" \
  --tz "${TZ_BOGOTA}" \
  --session "${SESSION}" \
  --message "Usa jarvis_search_leads para buscar nuevos leads para UGC Colombia, Reyes del Contenido y Prolab. Califica con jarvis_qualify_lead y guarda los de score >= 7 con jarvis_store_lead." \
  --announce \
  --channel "${ANNOUNCE_CHANNEL}" \
  --to "${OWNER_PHONE}"

echo "[jarvis] Crons instalados. Verifica con: openclaw cron list"
