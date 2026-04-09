# Fase 5 — Crons nativos de Jarvis (version Windows/PowerShell)
#
# Ejecutar una vez despues de instalar el plugin jarvis:
#   .\scripts\install-crons.ps1

$ErrorActionPreference = "Stop"

$TzBogota = "America/Bogota"
$Session = "isolated"
$AnnounceChannel = if ($env:JARVIS_ANNOUNCE_CHANNEL) { $env:JARVIS_ANNOUNCE_CHANNEL } else { "whatsapp" }
$OwnerPhone = if ($env:OWNER_PHONE) { $env:OWNER_PHONE } else { "573132947776" }

Write-Host "[jarvis] Instalando crons nativos en OpenClaw..."

# --- 1. Daily Content Engine (L-V 6AM Bogota) ---
openclaw cron add `
  --name "jarvis-daily-engine" `
  --cron "0 6 * * 1-5" `
  --tz $TzBogota `
  --session $Session `
  --message "Ejecuta el motor de contenido diario usando jarvis_web_search para tendencias y jarvis_read_emails para newsletters. Genera 3 ideas de contenido con hooks." `
  --announce `
  --channel $AnnounceChannel `
  --to $OwnerPhone

# --- 2. Social Comment Scanner (cada 30 min) ---
openclaw cron add `
  --name "jarvis-social-comments" `
  --cron "*/30 * * * *" `
  --session $Session `
  --message "Usa jarvis_get_pending_comments para revisar comentarios pendientes en las 7 cuentas de IG." `
  --announce `
  --channel $AnnounceChannel `
  --to $OwnerPhone

# --- 3. Lead Hunter Daily Scan (L-V 7AM Bogota) ---
openclaw cron add `
  --name "jarvis-lead-scan" `
  --cron "0 7 * * 1-5" `
  --tz $TzBogota `
  --session $Session `
  --message "Usa jarvis_search_leads para buscar leads para UGC Colombia, Reyes del Contenido y Prolab. Califica y guarda los de score >= 7." `
  --announce `
  --channel $AnnounceChannel `
  --to $OwnerPhone

Write-Host "[jarvis] Crons instalados. Verifica con: openclaw cron list"
