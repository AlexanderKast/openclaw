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
    handler: async (ctx: { args?: string; userId?: string }) => {
      try {
        const userId = ctx.userId ?? "manual";
        const { runId } = await api.runtime.subagent.run({
          sessionKey: `jarvis-engine:${userId}`,
          message: "Ejecuta el motor diario de contenido",
          deliver: false,
        });
        return {
          text: `Generando el contenido del día, dame un momento... (runId: ${runId})`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[jarvis] /engine failed: ${message}`);
        return { text: `Se me complicó generando el contenido: ${message}` };
      }
    },
  };
}
