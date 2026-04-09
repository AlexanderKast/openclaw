import fs from "fs/promises";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const MEMORY_BASE_DIR = "/app/data/memory";

const RetrieveMemorySchema = Type.Object(
  {
    key: Type.String({ description: "Clave a recuperar" }),
    namespace: Type.Optional(
      Type.String({ description: 'Espacio de nombres (default: "global")' }),
    ),
  },
  { additionalProperties: false },
);

export function createRetrieveMemoryTool(): AnyAgentTool {
  return {
    name: "jarvis_retrieve_memory",
    label: "Jarvis Retrieve Memory",
    description: "Recupera un valor almacenado en la memoria de Jarvis por su clave.",
    parameters: RetrieveMemorySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const key = readStringParam(rawParams, "key", { required: true });
      const namespace = readStringParam(rawParams, "namespace") ?? "global";

      try {
        const filePath = path.join(MEMORY_BASE_DIR, namespace, `${key}.json`);
        try {
          const raw = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(raw);
          return jsonResult({
            status: "ok",
            found: true,
            key,
            value: data.value,
            updatedAt: data.updatedAt,
          });
        } catch {
          return jsonResult({ status: "ok", found: false, key, namespace });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
