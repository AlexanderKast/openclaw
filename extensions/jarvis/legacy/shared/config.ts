/**
 * Subset minimo del config legacy para los connectors copiados.
 * Solo incluye lo que el wrapper POC necesita (whatsapp).
 *
 * Para Fase 2 completa: copiar el archivo entero de jarvis-assistant/src/shared/config.ts
 * o reemplazarlo por un lector de api.pluginConfig.
 */

export const config = {
  wa: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  },
} as const;
