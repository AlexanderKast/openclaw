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

const ReadNoteSchema = Type.Object(
  {
    path: Type.String({ description: "Ruta de la nota dentro del vault" }),
  },
  { additionalProperties: false },
);

export function createReadNoteTool(): AnyAgentTool {
  return {
    name: "jarvis_read_note",
    label: "Jarvis Read Note",
    description: "Lee una nota desde el vault de Obsidian.",
    parameters: ReadNoteSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const notePath = readStringParam(rawParams, "path", { required: true });

      try {
        const docId = notePath.replace(/\//g, "_").replace(/\s+/g, "-");
        const url = `${couchBase()}/${OBSIDIAN_DB}/${encodeURIComponent(docId)}`;
        try {
          const res = await axios.get(url, { headers: couchHeaders() });
          return jsonResult({
            status: "ok",
            found: true,
            path: notePath,
            content: res.data.content,
            updatedAt: res.data.updatedAt,
          });
        } catch {
          return jsonResult({ status: "ok", found: false, path: notePath });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
