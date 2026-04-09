import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  SOCIAL_ACCOUNTS,
  isInstagramApiReady,
  replyToComment,
} from "../../../legacy/connectors/instagram-api.js";

const BRAND_VOICES: Record<string, string> = {
  alexander_cast: "Experto en Estrategia Digital, IA y Contenido. Cercano pero con autoridad. Datos duros + opinion propia. Colombiano, directo.",
  reyes_contenido: "Comunidad de creadores. Tono motivador, inclusivo, energetico. Somos un equipo. Emojis moderados.",
  ugc_colombia: "Agencia UGC profesional. Calido pero orientado a servicio. Respuestas que demuestren expertise en UGC.",
  esposa: "Marca personal autentica. Cercana, empatica, inspiradora. Tono femenino natural.",
  infiny_latam: "Agencia de marketing digital. Profesional, orientado a resultados, growth mindset.",
  kreoon: "Plataforma tech. Innovador, moderno, accesible. Explica tech de forma simple.",
  prolab: "Proveeduria dropshipping. Emprendedor, practico, enfocado en resultados. Habla de oportunidades.",
};

const BatchReplyCommentsSchema = Type.Object(
  {
    account: Type.String(),
    comments: Type.String({ description: "JSON array de comentarios [{id, text, username}]" }),
  },
  { additionalProperties: false },
);

export function createBatchReplyCommentsTool(): AnyAgentTool {
  return {
    name: "jarvis_batch_reply_comments",
    label: "Jarvis Batch Reply Comments",
    description: "Arma el prompt para generar respuestas de multiples comentarios de una cuenta con el tono de marca correcto. El LLM del orquestador genera las respuestas finales.",
    parameters: BatchReplyCommentsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "";
      const commentsRaw = readStringParam(rawParams, "comments") ?? "[]";
      try {
        const voice = BRAND_VOICES[account] ?? "Profesional y amable";
        let comments: unknown;
        try {
          comments = JSON.parse(commentsRaw);
        } catch {
          return jsonResult({ status: "failed", error: "Invalid comments JSON" });
        }
        const handle = (SOCIAL_ACCOUNTS as Record<string, { instagram?: string }>)[account]?.instagram ?? account;
        const systemPrompt = `Eres el community manager de @${handle}.
Voz de marca: ${voice}

Genera respuestas para cada comentario. Responde en JSON array:
[{"commentId": "...", "reply": "..."}]

Reglas:
- Maximo 150 caracteres por respuesta
- Usa el nombre del usuario cuando sea natural
- Si es spam/hate, responde con clase o ignora (reply: null)
- Si detectas un lead potencial, marca con [LEAD] al inicio del reply
- Emojis moderados, naturales`;
        return jsonResult({
          status: "ok",
          mode: "prompt_ready",
          note: "Envia systemPrompt + userPayload al LLM y luego usa jarvis_reply_comment por cada reply generado.",
          systemPrompt,
          userPayload: comments,
          apiReady: isInstagramApiReady(),
          account,
          voice,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
      // Keep replyToComment referenced for tree-shaking-safe import
      void replyToComment;
    },
  };
}
