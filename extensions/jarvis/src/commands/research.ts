/**
 * /research command — investigates a brand by email or @handle.
 *
 * Registered via `api.registerCommand(...)` (native plugin command surface).
 * The handler delegates to the `brand-researcher` sub-agent through
 * `api.runtime.subagent` once that sub-agent is registered in phase 4/5.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

export function createResearchCommand(api: OpenClawPluginApi) {
  return {
    name: "research",
    description: "Investiga una marca por email (ej: /research founder@kreoon.com) o @handle.",
    acceptsArgs: true,
    // TODO(phase-4): confirm requireAuth default is acceptable for owner-only commands.
    handler: async (ctx: { args?: string }) => {
      const raw = (ctx.args ?? "").trim();
      if (!raw) {
        return {
          text: "Uso: /research <email@dominio.com> o /research @handle",
        };
      }

      const emailMatch = raw.match(/(\S+@\S+\.\S+)/);
      const handleMatch = raw.match(/@(\w[\w._]{1,30}\w)/);

      try {
        const userId = (ctx as { userId?: string }).userId ?? "default";
        const target = emailMatch?.[1] ?? (handleMatch ? `@${handleMatch[1]}` : null);
        if (!target) {
          return { text: "Uso: /research <email@dominio.com> o /research @handle" };
        }
        const { runId } = await api.runtime.subagent.run({
          sessionKey: `jarvis-brand-researcher:${userId}`,
          message: emailMatch
            ? `Investiga la marca del email: ${emailMatch[1]}`
            : `Diagnostica la marca @${handleMatch![1]}`,
          deliver: false,
        });
        return {
          text: emailMatch
            ? `Dale, investigando la marca de ${emailMatch[1]}... (runId: ${runId})`
            : `Mirando @${handleMatch![1]}, ya te cuento... (runId: ${runId})`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[jarvis] /research failed: ${message}`);
        return { text: `Uy parce, no pude con esa investigación: ${message}` };
      }
    },
  };
}
