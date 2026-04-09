import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { config } from "../../../legacy/shared/config.js";

const OBSIDIAN_DB = process.env.OBSIDIAN_DB || "obsidian-vault";

function couchHeaders() {
  const { user, pass } = config.couchdb;
  const auth =
    user && pass
      ? {
          Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
        }
      : {};
  return { "Content-Type": "application/json", ...auth };
}

function couchBase(): string {
  return config.couchdb.url || "http://localhost:5984";
}

const SaveNoteSchema = Type.Object(
  {
    path: Type.String({
      description: 'Ruta de la nota dentro del vault (ej: "proyectos/jarvis.md")',
    }),
    content: Type.String({ description: "Contenido de la nota en Markdown" }),
  },
  { additionalProperties: false },
);

export function createSaveNoteTool(): AnyAgentTool {
  return {
    name: "jarvis_save_note",
    label: "Jarvis Save Note",
    description: "Guarda una nota en el vault de Obsidian via CouchDB.",
    parameters: SaveNoteSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const notePath = readStringParam(rawParams, "path", { required: true });
      const content = readStringParam(rawParams, "content", { required: true });

      try {
        const docId = notePath.replace(/\//g, "_").replace(/\s+/g, "-");
        const url = `${couchBase()}/${OBSIDIAN_DB}/${encodeURIComponent(docId)}`;
        const headers = couchHeaders();

        let rev: string | undefined;
        try {
          const existing = await axios.get(url, { headers });
          rev = existing.data._rev as string;
        } catch {
          // not found
        }

        const doc: Record<string, unknown> = {
          _id: docId,
          path: notePath,
          content,
          updatedAt: new Date().toISOString(),
        };
        if (rev) doc._rev = rev;

        await axios.put(url, doc, { headers });
        return jsonResult({
          status: "ok",
          success: true,
          path: notePath,
          docId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
