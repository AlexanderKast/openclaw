import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { sendText } from "../../../legacy/connectors/whatsapp.js";

/**
 * Tool wrapper para WhatsApp sendText.
 *
 * Patron canonico para los ~30 wrappers de Fase 2:
 *   1. Schema typebox con additionalProperties: false
 *   2. Helpers read*Param para sacar valores tipados de rawParams
 *   3. Try/catch que retorna jsonResult({ status: "failed", error })
 *   4. Importa la logica desde legacy/ sin tocar el connector
 */

const SendTextSchema = Type.Object(
  {
    to: Type.String({
      description:
        "Numero de telefono destino en formato E.164 sin '+' (ej: 573132947776).",
    }),
    text: Type.String({
      description: "Texto del mensaje. WhatsApp limita a ~4096 caracteres.",
    }),
  },
  { additionalProperties: false },
);

export function createWhatsAppSendTextTool(): AnyAgentTool {
  return {
    name: "jarvis_whatsapp_send_text",
    label: "Jarvis WhatsApp Send Text",
    description:
      "Envia un mensaje de texto a un numero por WhatsApp Cloud API. " +
      "Usa el connector legacy de jarvis-assistant.",
    parameters: SendTextSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
    ) => {
      const to = readStringParam(rawParams, "to", { required: true });
      const text = readStringParam(rawParams, "text", { required: true });

      try {
        await sendText(to, text);
        return jsonResult({
          status: "ok",
          to,
          length: text.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          status: "failed",
          error: message,
        });
      }
    },
  };
}
