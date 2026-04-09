import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const GenerateHashtagsSchema = Type.Object(
  {
    topic: Type.String({ description: "Tema o nicho del contenido" }),
    platform: Type.String({ description: "Plataforma: instagram, tiktok, youtube, linkedin" }),
    count: Type.Optional(Type.Number({ description: "Cantidad a generar (default 15)" })),
  },
  { additionalProperties: false },
);

export function createGenerateHashtagsTool(): AnyAgentTool {
  return {
    name: "jarvis_generate_hashtags",
    label: "Jarvis Generate Hashtags",
    description:
      "Arma el prompt para generar hashtags optimizados segun plataforma y tema con mix de tamanos.",
    parameters: GenerateHashtagsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const topic = readStringParam(rawParams, "topic", { required: true });
        const platform = readStringParam(rawParams, "platform", { required: true });
        const count = readNumberParam(rawParams, "count") ?? 15;

        const prompt = `Genera ${count} hashtags optimizados para ${platform} sobre el tema: "${topic}".
Mix recomendado: 30% hashtags grandes (>1M posts), 40% medianos (100K-1M), 30% pequenos (<100K) o de nicho.
Incluye hashtags en espanol e ingles si aplica para mayor alcance.
Formato: lista de hashtags listos para copiar y pegar.`;

        return jsonResult({
          status: "ok",
          prompt,
          topic,
          platform,
          count,
          instructions: "LLM debe generar la respuesta final usando este prompt",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
