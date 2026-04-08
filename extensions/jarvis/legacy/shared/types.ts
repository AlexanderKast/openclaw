/**
 * Subset minimo de tipos compartidos requeridos por los connectors legacy.
 * Copiado de jarvis-assistant/src/shared/types.ts.
 *
 * Para Fase 2 completa: copiar el archivo entero, son ~143 lineas.
 */

export type MediaAttachment = {
  type: "image" | "video" | "audio" | "document";
  url?: string;
  caption?: string;
};

export type TeamMember = {
  phone: string;
  name: string;
  role: "owner" | "ops" | "community" | "readonly";
  email: string;
};
