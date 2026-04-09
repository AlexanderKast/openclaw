import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const GenerateOutreachSchema = Type.Object(
  {
    business: Type.String({ description: "Desde que negocio se contacta" }),
    lead_name: Type.String(),
    lead_handle: Type.Optional(Type.String()),
    lead_context: Type.String({ description: "Que hace, que necesita" }),
    channel: Type.String({ description: "dm_instagram, email, whatsapp" }),
  },
  { additionalProperties: false },
);

const TEMPLATES: Record<string, string> = {
  ugc_colombia:
    "Agencia UGC Colombia. Creamos contenido autentico que convierte. Hemos trabajado con marcas como X, Y, Z.",
  reyes_contenido:
    "Comunidad de creadores de contenido mas grande de Colombia. Mentoria, networking, oportunidades.",
  prolab:
    "Proveeduria de dropshipping de productos de salud. Sin inventario, sin riesgo, margenes del 40-60%.",
  infiny_latam: "Agencia de marketing digital. Growth, ads, estrategia de contenido.",
  kreoon: "Desarrollo de software y plataformas digitales.",
};

export function createGenerateOutreachTool(): AnyAgentTool {
  return {
    name: "jarvis_generate_outreach",
    label: "Jarvis Generate Outreach",
    description:
      "Arma el prompt para generar un mensaje de outreach personalizado para un lead segun canal.",
    parameters: GenerateOutreachSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const business = readStringParam(rawParams, "business", { required: true });
        const leadName = readStringParam(rawParams, "lead_name", { required: true });
        const leadHandle = readStringParam(rawParams, "lead_handle") ?? "N/A";
        const leadContext = readStringParam(rawParams, "lead_context", { required: true });
        const channel = readStringParam(rawParams, "channel", { required: true });

        const channelConstraint =
          channel === "dm_instagram"
            ? "Maximo 300 caracteres. Directo, sin formalidades."
            : channel === "email"
              ? "Subject line + body. Maximo 200 palabras."
              : channel === "whatsapp"
                ? "Mensaje corto, conversacional. Maximo 200 caracteres."
                : "";

        const systemPrompt = `Genera un mensaje de outreach para ${channel} desde ${business}.
Contexto de la empresa: ${TEMPLATES[business] || business}
Tono: Profesional pero cercano. NO suene generico. Personaliza al maximo.
${channelConstraint}`;

        const userPrompt = `Lead: ${leadName}
Handle: ${leadHandle}
Contexto: ${leadContext}`;

        return jsonResult({
          status: "ok",
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          channel,
          business,
          instructions: "LLM debe generar el mensaje de outreach final usando estos prompts.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
