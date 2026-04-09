# Jarvis Subagents

Fase 3 del plugin Jarvis: capa de sub-agentes sobre `api.runtime.subagent.run`.

## Arquitectura

El agente raiz (`core`) recibe el mensaje del usuario, clasifica el intent y
delega a uno de los 8 sub-agentes especializados usando la tool
`jarvis_delegate`. Cada sub-agente corre como una sesion independiente de
OpenClaw (via `api.runtime.subagent.run`), con su propio system prompt y su
propio subset de tools `jarvis_*`.

## Sub-agentes registrados

| Sub-agente         | Modo            | Dominio                                               |
| ------------------ | --------------- | ----------------------------------------------------- |
| `core`             | conversational  | Router raiz, acceso a TODOS los tools                 |
| `memory`           | conversational  | Memoria clave-valor + Obsidian (CouchDB)              |
| `content`          | conversational  | Copy, captions, hashtags, briefs UGC, calendar        |
| `ops`              | conversational  | Gmail, Calendar multi-cuenta, Meta Ads, GitHub, WA    |
| `analyst`          | conversational  | Diagnostico de posts/perfiles sociales                |
| `social`           | conversational  | Gestion de 7 cuentas IG (comentarios, DMs, metricas)  |
| `lead-hunter`      | conversational  | Prospeccion y pipeline de leads para 5 negocios       |
| `engine`           | pipeline        | Generacion diaria de briefings/guiones de video       |
| `brand-researcher` | pipeline        | Diagnostico de marca por email o handle IG            |

## Tools permitidas por sub-agente

Ver `registry.ts` — cada `SubagentDefinition` lista explicitamente las tools
`jarvis_*` que puede invocar. El agente `core` es el unico con acceso
universal.

## Como invocar

Desde el agente raiz (LLM runtime), usar la tool `jarvis_delegate`:

```json
{
  "agent": "ops",
  "message": "Manda un correo a Diana pidiendole el reporte semanal",
  "user_id": "alexander"
}
```

Retorna `{ runId, sessionKey }`. El caller puede luego esperar con
`api.runtime.subagent.waitForRun({ runId })` o leer mensajes con
`api.runtime.subagent.getSessionMessages({ sessionKey })`.

## Session keys

Cada sub-agente mantiene una sesion persistente por usuario siguiendo el
patron:

    agent:main:subagent:<nombre>:<userId>

Esto permite que cada usuario tenga contexto separado con cada sub-agente.
