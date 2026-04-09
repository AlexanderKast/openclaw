import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { searchWeb } from "../../../legacy/shared/perplexity.js";

const QualifyLeadSchema = Type.Object(
  {
    handle: Type.String({ description: "@handle del lead" }),
    business: Type.String({ description: "Para que negocio" }),
    notes: Type.Optional(Type.String({ description: "Info adicional" })),
  },
  { additionalProperties: false },
);

export function createQualifyLeadTool(): AnyAgentTool {
  return {
    name: "jarvis_qualify_lead",
    label: "Jarvis Qualify Lead",
    description:
      "Investiga via Perplexity un lead y prepara el prompt para que el LLM lo califique (score 1-10 + justificacion).",
    parameters: QualifyLeadSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const handle = readStringParam(rawParams, "handle", { required: true });
        const business = readStringParam(rawParams, "business", { required: true });
        const notes = readStringParam(rawParams, "notes") ?? "";

        const query = `${handle} Instagram ${business === "prolab" ? "emprendedor" : "marca"} Colombia`;
        const webResults = await searchWeb(query);

        const qualificationPrompt = `Califica este lead para ${business}. Score 1-10 con justificacion. Tiene presupuesto probable? Necesita el servicio? Es accesible?

Lead: ${handle}
Notas: ${notes}

Info encontrada:
${String((webResults as any).result ?? "").slice(0, 2000)}`;

        return jsonResult({
          status: "ok",
          handle,
          business,
          web_results: webResults,
          qualification_prompt: qualificationPrompt,
          instructions: "LLM debe generar la calificacion usando este prompt.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
