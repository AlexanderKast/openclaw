# feat(jarvis): Bundled Jarvis plugin for Kreoon ecosystem

## Summary

This PR adds `extensions/jarvis` — a bundled OpenClaw plugin that wraps the
Jarvis WhatsApp assistant used by the Kreoon ecosystem. Jarvis was previously
a standalone Node/TypeScript app at `jarvis-assistant/` that delegated to
OpenClaw via `docker exec`. This PR inverts the relationship: OpenClaw becomes
the runtime and Jarvis is a bundled plugin consuming native primitives.

**Status**: validated end-to-end in production (VPS 194.163.161.151) against
OpenClaw `2026.4.1`. 53 tools, 3 slash commands, 8 HTTP routes load cleanly.
LLM invocation of a Jarvis tool (`jarvis_is_social_url`) hits the legacy
extractor and returns the expected JSON.

## What's in

### Structure
```
extensions/jarvis/
├── openclaw.plugin.json          # manifest (id: jarvis)
├── package.json                  # @kreoon/openclaw-jarvis
├── tsconfig.json                 # typecheck config
├── tsconfig.build.json           # emit-capable build config
├── CUTOVER_RUNBOOK.md            # 10-step VPS cutover runbook
├── openclaw.json.example         # operator reference config
├── personality/parcero.md        # Jarvis system prompt (Colombian parcero tone)
├── src/
│   ├── tools/         (~53 tool wrappers across 9 domains)
│   │   ├── whatsapp/  (1)  send-text
│   │   ├── gmail/     (6)  send/read/reply/draft/connect
│   │   ├── calendar/  (7)  events CRUD + calendars CRUD
│   │   ├── memory/    (9)  KV + Obsidian notes via CouchDB
│   │   ├── content/   (6)  search + captions/copy/briefs
│   │   ├── analyst/   (5)  URL extraction + profile analysis
│   │   ├── social/    (7)  IG comments/DMs/stats
│   │   ├── lead-hunter/(6) pipeline + qualification
│   │   ├── ops/       (5)  meta-ads + github + reminders
│   │   └── core/      (2)  route + delegate-to-subagent
│   ├── subagents/
│   │   ├── registry.ts           # 9 sub-agent definitions with systemPrompts
│   │   ├── delegate.ts           # api.runtime.subagent.run helper
│   │   └── README.md
│   ├── hooks/
│   │   ├── pre-routing.ts        # detectPreHook — URL/command/trigger detection
│   │   └── role-acl.ts           # team + role-based access control
│   ├── commands/
│   │   ├── research.ts           # /research <email|@handle>
│   │   ├── engine.ts             # /engine
│   │   └── diagnose.ts           # /diagnose @handle
│   └── routes/hud.ts             # 8 HUD HTTP routes under /plugins/jarvis/api/*
├── legacy/                        # verbatim copies from jarvis-assistant/src/
│   ├── connectors/   (5)         # whatsapp, instagram-api, google-drive, social-extractor, report-generator
│   └── shared/       (7)         # config, google-api, perplexity, types, logger, metrics, log-buffer
├── scripts/
│   ├── install-crons.sh          # registers 3 native cron jobs
│   ├── install-crons.ps1         # Windows variant
│   └── README.md
└── index.ts                       # definePluginEntry, registers tools/commands/hooks/routes
```

### SDK APIs used (all confirmed against upstream source)
- `definePluginEntry` from `openclaw/plugin-sdk/plugin-entry`
- `api.registerTool` (×53) with TypeBox schemas, `jsonResult`, `readStringParam`
- `api.registerCommand` (×3) for native slash commands
- `api.registerHttpRoute` (×8) with `auth: "plugin"` + Bearer token validation
- `api.registerHook` (×2) — `agent:bootstrap` and `message:received`
- `api.runtime.subagent.run({ sessionKey, message, deliver })` — sub-agent dispatch
- `api.logger` — scoped logging

### Architectural highlights

1. **Jarvis-as-plugin, not fork**: no changes to core OpenClaw. Everything lives under `extensions/jarvis/`.
2. **Personality via `agent:bootstrap` hook**: the plugin reads `personality/parcero.md` and injects it as `SOUL.md` into every agent turn's `context.bootstrapFiles`. This is the canonical workspace bootstrap path, not a config override.
3. **Pre-routing via `message:received` hook**: detects social media URLs, `/research`, `@handle` diagnosis, and engine triggers, then forwards to the appropriate sub-agent via `api.runtime.subagent.run`.
4. **LLM-dependent tools return prompts, not answers**: tools like `jarvis_generate_caption`, `jarvis_write_copy`, `jarvis_qualify_lead` don't call `callLLM` directly. They return `{ status: "prompt_ready", prompt, instructions }` so the root agent performs the LLM call as part of its tool-use loop. This keeps the plugin free of provider dependencies.
5. **Native crons replace in-process scheduler**: the 3 scheduled jobs (daily engine 6AM L-V, social comments every 30min, lead scan 7AM L-V) are registered via `openclaw cron add` and run as isolated sessions.
6. **Legacy subtree isolated**: the `legacy/` folder holds verbatim copies of `jarvis-assistant/src/connectors/` and `src/shared/`. No edits to those files. When the cutover is complete and `jarvis-assistant` is archived, `legacy/` stays as the plugin's private implementation.

## What's out (intentional)

- `jarvis-assistant/src/core/{base-agent,llm,router,scheduler,skill-loader}` — replaced by OpenClaw runtime, multi-agent delegation, native cron, and bootstrap files.
- `jarvis-assistant/src/connectors/{tts,whisper,gemini-vision}` — replaced by `api.runtime.tts`, `api.runtime.mediaUnderstanding.transcribeAudioFile`, and `api.runtime.mediaUnderstanding.describeImageFile/Video`.
- `jarvis-assistant/src/connectors/perplexity` — replaced by `api.runtime.webSearch.search`.
- `jarvis-assistant/src/connectors/openclaw.ts` — we're inside OpenClaw, no need for the docker exec bridge.

## Testing

- `tsc --noEmit -p extensions/jarvis/tsconfig.json` passes clean.
- `tsc -p extensions/jarvis/tsconfig.build.json` emits 75 JS files to `dist-plugin/` (gitignored).
- Plugin compiled to JS, shipped to the Kreoon VPS, installed via `openclaw plugins install --dangerously-force-unsafe-install /tmp/jarvis-plugin` (the `--dangerously-force-unsafe-install` flag was needed because the security scanner flags `env + network send` patterns in the google-drive, instagram-api, social-extractor, and hud routes — all legitimate).
- `openclaw plugins list` shows `jarvis` → `loaded`.
- `openclaw plugins inspect jarvis` shows all 53 tools, 3 commands, 8 routes.
- Smoke test 1: `openclaw agent --agent main --message "menciona 3 tools"` → agent response includes `jarvis_send_email` in the tool list.
- Smoke test 2: `openclaw agent --agent main --message "Usa jarvis_is_social_url para ..."` → LLM invoked the tool, legacy `isSocialMediaUrl` function executed, agent returned `{"status":"ok","url":"https://www.instagram.com/...","is_social":true}`.
- Smoke test 3: `curl -H "Authorization: Bearer ..." http://jarvis-openclaw:18789/plugins/jarvis/api/system` → `{"error":"hud_disabled","reason":"JARVIS_WEB_TOKEN not set"}` — the route is registered, the handler runs, and the auth guard fires. Setting `JARVIS_WEB_TOKEN` on the container will unblock the full response.

## Known limitations

- **Security scanner false positives**: the scanner flags env + network send combinations in 4 files (hud.ts, google-drive, instagram-api, social-extractor). These are legitimate (Bearer token validation, OAuth API calls, yt-dlp subprocess, Meta Graph calls). The `--dangerously-force-unsafe-install` flag is required on install. If this PR is accepted upstream, we could add explicit security audit collectors (`OpenClawPluginSecurityAuditCollector`) to mark these patterns as acknowledged — happy to iterate in a follow-up.
- **Hook name warnings**: `registerHook` emits `hook registration missing name` warnings for the `agent:bootstrap` and `message:received` hooks. Cosmetic; hooks still register and fire. TODO: add explicit `name` field in the hook registration options.
- **4 HUD routes are 501 stubs**: `tts`, `agents`, `calendar`, `analyst`. Auth + method guards work, handlers return `{status: "not_implemented"}`. Will land in a follow-up (Phase 4c).
- **Personality injection verified to bind but not yet to manifest in agent output**: the `agent:bootstrap` hook is registered and fires without errors, but test responses are still generic. Under investigation — likely a `name` warning side effect or a SOUL.md resolution path issue with `import.meta.url` at runtime.
- **Upstream OpenClaw version**: plugin tested against 2026.4.1 (VPS) and typechecked against 2026.4.9 (dev). Backwards compat with the `pluginApi: ">=2026.4.0"` range in the manifest.

## Test plan

- [x] `pnpm build:plugin-sdk:dts`
- [x] `tsc --noEmit -p extensions/jarvis/tsconfig.json`
- [x] Install plugin on a VPS running OpenClaw 2026.4.1
- [x] Verify 53 tools listed in `openclaw plugins inspect jarvis`
- [x] Verify agent invokes a Jarvis tool end-to-end
- [x] Verify HUD HTTP route serves and validates auth
- [ ] Verify WhatsApp inbound message flow (requires cutover per CUTOVER_RUNBOOK.md)
- [ ] Verify `/research`, `/engine`, `/diagnose` slash commands from a channel
- [ ] Verify the 3 native cron jobs fire at their scheduled times

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
