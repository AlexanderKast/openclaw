/**
 * /diagnose command — brand diagnosis by @handle.
 *
 * Ported from jarvis-assistant/src/core/router.ts DIAGNOSIS_TRIGGER block.
 * Delegates to the `brand-researcher` sub-agent.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

export function createDiagnoseCommand(api: OpenClawPluginApi) {
  return {
    name: "diagnose",
    description: "Diagnostica una marca por @handle de Instagram.",
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const raw = (ctx.args ?? "").trim();
      const handleMatch = raw.match(/@?(\w[\w._]{1,30}\w)/);
      if (!handleMatch) {
        return { text: "Uso: /diagnose @handle" };
      }
      const handle = handleMatch[1];
      try {
        const userId = (ctx as { userId?: string }).userId ?? "default";
        const { runId } = await api.runtime.subagent.run({
          sessionKey: `jarvis-brand-researcher:${userId}`,
          message: `Diagnostica la marca @${handle}`,
          deliver: false,
        });
        return {
          text: `Mirando @${handle}, ya te cuento... (runId: ${runId})`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[jarvis] /diagnose failed: ${message}`);
        return { text: `Uy, no pude hacer el diagnóstico: ${message}` };
      }
    },
  };
}
