/**
 * /engine command — triggers the daily content engine sub-agent.
 *
 * Ported behavior from jarvis-assistant/src/core/router.ts ENGINE_TRIGGERS
 * block. Delegates to the `engine` sub-agent.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

export function createEngineCommand(api: OpenClawPluginApi) {
  return {
    name: "engine",
    description: "Ejecuta el motor diario de contenido (reporte + guiones + B-roll).",
    acceptsArgs: false,
    handler: async (_ctx: { args?: string }) => {
      try {
        // TODO(phase-4): invoke sub-agent once registered, e.g.
        //   const result = await api.runtime.subagent.run({
        //     agent: "jarvis/engine",
        //     input: { trigger: "manual" },
        //   });
        return {
          text: "Generando el contenido del día, dame un momento... (engine sub-agent pendiente de fase 4)",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[jarvis] /engine failed: ${message}`);
        return { text: `Se me complicó generando el contenido: ${message}` };
      }
    },
  };
}
