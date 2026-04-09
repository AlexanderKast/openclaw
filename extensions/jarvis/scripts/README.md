# Scripts de instalacion — Jarvis plugin

## `install-crons.sh` / `install-crons.ps1`

Instala los 3 cron jobs de Jarvis en el scheduler nativo de OpenClaw.
Reemplaza el scheduler antiguo de `jarvis-assistant/src/core/scheduler.ts`.

### Jobs registrados

| Nombre | Cron | Descripcion |
|---|---|---|
| `jarvis-daily-engine` | `0 6 * * 1-5` (L-V 6AM Bogota) | Motor de contenido diario. Busca tendencias y newsletters, genera 3 ideas con hooks. |
| `jarvis-social-comments` | `*/30 * * * *` (cada 30 min) | Revisa comentarios pendientes de las 7 cuentas de Instagram. |
| `jarvis-lead-scan` | `0 7 * * 1-5` (L-V 7AM Bogota) | Busca leads para UGC Colombia, Reyes del Contenido y Prolab. |

### Uso

En el VPS (Linux/Mac):
```bash
cd /opt/openclaw/extensions/jarvis
chmod +x scripts/install-crons.sh
./scripts/install-crons.sh
```

En Windows:
```powershell
cd C:\openclaw\extensions\jarvis
.\scripts\install-crons.ps1
```

### Variables de entorno (opcionales)

| Variable | Default | Descripcion |
|---|---|---|
| `JARVIS_ANNOUNCE_CHANNEL` | `whatsapp` | Canal para anunciar el output del cron |
| `OWNER_PHONE` | `573132947776` | Destino del anuncio |

### Verificacion

```bash
openclaw cron list
openclaw cron runs --id <job-id>  # Historial de ejecuciones
```

### Desinstalar

```bash
openclaw cron delete --name jarvis-daily-engine
openclaw cron delete --name jarvis-social-comments
openclaw cron delete --name jarvis-lead-scan
```
