import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { jsonResult } from "openclaw/plugin-sdk/provider-web-search";
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

const VerifyObsidianSchema = Type.Object({}, { additionalProperties: false });

export function createVerifyObsidianTool(): AnyAgentTool {
  return {
    name: "jarvis_verify_obsidian",
    label: "Jarvis Verify Obsidian",
    description:
      "Verifica la conexion con CouchDB/Obsidian y reporta estado del vault.",
    parameters: VerifyObsidianSchema,
    execute: async (_toolCallId: string, _rawParams: Record<string, unknown>) => {
      try {
        const base = couchBase();
        const headers = couchHeaders();

        const upRes = await axios.get(`${base}/_up`, { headers });
        const isUp = upRes.data?.status === "ok";

        const dbRes = await axios.get(`${base}/${OBSIDIAN_DB}`, { headers });
        const docCount = dbRes.data?.doc_count ?? 0;
        const dbName = dbRes.data?.db_name ?? OBSIDIAN_DB;

        return jsonResult({
          status: "ok",
          couchdb: isUp,
          database: dbName,
          docCount,
          url: base,
          note: "Obsidian LiveSync uses file path as _id directly (slashes replaced with underscores)",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          status: "failed",
          error: message,
          url: couchBase(),
          database: OBSIDIAN_DB,
        });
      }
    },
  };
}
