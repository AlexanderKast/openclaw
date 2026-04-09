import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import { SUBAGENTS } from "./registry.js";

/**
 * Lanza un sub-agente de Jarvis via api.runtime.subagent.run.
 *
 * El sessionKey se construye a partir del prefijo definido en el registry
 * mas el userId (para que cada usuario tenga su propia sesion persistente
 * por sub-agente).
 */
export async function delegateToSubagent(
  api: OpenClawPluginApi,
  params: { agent: string; message: string; userId?: string },
): Promise<{ runId: string; sessionKey: string }> {
  const def = SUBAGENTS[params.agent];
  if (!def) {
    throw new Error(`Unknown subagent: ${params.agent}`);
  }

  const sessionKey = `${def.sessionKeyPrefix}:${params.userId ?? "default"}`;

  const { runId } = await api.runtime.subagent.run({
    sessionKey,
    message: params.message,
    deliver: false,
  });

  return { runId, sessionKey };
}
