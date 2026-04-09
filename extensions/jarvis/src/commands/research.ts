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
        // TODO(phase-4): invoke sub-agent once registered, e.g.
        //   const result = await api.runtime.subagent.run({
        //     agent: "jarvis/brand-researcher",
        //     input: { email: emailMatch?.[1], handle: handleMatch?.[1] },
        //   });
        // For now return a stub so the command is wired end-to-end.
        if (emailMatch) {
          return {
            text: `Dale, investigando la marca por email: ${emailMatch[1]}. (brand-researcher pendiente de fase 4)`,
          };
        }
        if (handleMatch) {
          return {
            text: `Mirando esa marca @${handleMatch[1]}... (brand-researcher pendiente de fase 4)`,
          };
        }
        return { text: "Uso: /research <email@dominio.com> o /research @handle" };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[jarvis] /research failed: ${message}`);
        return { text: `Uy parce, no pude con esa investigación: ${message}` };
      }
    },
  };
}
