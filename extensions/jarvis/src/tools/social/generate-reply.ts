import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { SOCIAL_ACCOUNTS } from "../../../legacy/connectors/instagram-api.js";

const BRAND_VOICES: Record<string, string> = {
  alexander_cast: "Experto en Estrategia Digital, IA y Contenido. Cercano pero con autoridad. Datos duros + opinion propia. Colombiano, directo.",
  reyes_contenido: "Comunidad de creadores. Tono motivador, inclusivo, energetico. Somos un equipo. Emojis moderados.",
  ugc_colombia: "Agencia UGC profesional. Calido pero orientado a servicio. Respuestas que demuestren expertise en UGC.",
  esposa: "Marca personal autentica. Cercana, empatica, inspiradora. Tono femenino natural.",
  infiny_latam: "Agencia de marketing digital. Profesional, orientado a resultados, growth mindset.",
  kreoon: "Plataforma tech. Innovador, moderno, accesible. Explica tech de forma simple.",
  prolab: "Proveeduria dropshipping. Emprendedor, practico, enfocado en resultados. Habla de oportunidades.",
};

const GenerateReplySchema = Type.Object(
  {
    account: Type.String({ description: "Cuenta (define el tono de voz)" }),
    comment_text: Type.String({ description: "Texto del comentario original" }),
    comment_username: Type.Optional(Type.String()),
    post_context: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createGenerateReplyTool(): AnyAgentTool {
  return {
    name: "jarvis_generate_reply",
    label: "Jarvis Generate Reply",
    description: "Arma el prompt para generar UNA respuesta corta (max 150 chars) a un comentario usando el tono de marca. El LLM del orquestador produce la respuesta final.",
    parameters: GenerateReplySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "";
      const commentText = readStringParam(rawParams, "comment_text") ?? "";
      const commentUsername = readStringParam(rawParams, "comment_username") ?? "usuario";
      const postContext = readStringParam(rawParams, "post_context") ?? "";
      try {
        const voice = BRAND_VOICES[account] ?? "Profesional y amable";
        const handle = (SOCIAL_ACCOUNTS as Record<string, { instagram?: string }>)[account]?.instagram ?? account;
        const systemPrompt = `Eres el CM de @${handle}. Voz: ${voice}. Genera UNA respuesta corta (max 150 chars) para este comentario. Solo el texto, nada mas.`;
        const userPrompt = `Comentario de @${commentUsername}: "${commentText}"${postContext ? `\nContexto del post: ${postContext}` : ""}`;
        return jsonResult({
          status: "ok",
          mode: "prompt_ready",
          systemPrompt,
          userPrompt,
          account,
          voice,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
