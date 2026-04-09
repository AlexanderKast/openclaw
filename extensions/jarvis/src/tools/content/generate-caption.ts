import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const GenerateCaptionSchema = Type.Object(
  {
    platform: Type.String({
      description: "Plataforma: instagram, tiktok, youtube, linkedin, twitter",
    }),
    topic: Type.String({ description: "Tema o producto del contenido" }),
    tone: Type.Optional(
      Type.String({ description: "Tono: casual, profesional, persuasivo, educativo, humoristico" }),
    ),
    language: Type.Optional(Type.String({ description: "Idioma: espanol (default) o ingles" })),
  },
  { additionalProperties: false },
);

export function createGenerateCaptionTool(): AnyAgentTool {
  return {
    name: "jarvis_generate_caption",
    label: "Jarvis Generate Caption",
    description:
      "Arma el prompt para generar un caption optimizado para redes sociales segun plataforma, tema y tono.",
    parameters: GenerateCaptionSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const platform = readStringParam(rawParams, "platform", { required: true });
        const topic = readStringParam(rawParams, "topic", { required: true });
        const tone = readStringParam(rawParams, "tone") ?? "casual";
        const language = readStringParam(rawParams, "language") ?? "espanol";

        const prompt = `Genera un caption de alta conversion para ${platform} sobre: "${topic}".
Tono: ${tone}. Idioma: ${language}.
Incluye: hook poderoso en la primera linea, cuerpo con valor real, CTA claro al final.
Adapta el formato y longitud optimos para ${platform}.`;

        return jsonResult({
          status: "ok",
          prompt,
          platform,
          topic,
          tone,
          language,
          instructions: "LLM debe generar la respuesta final usando este prompt",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
