import fs from "fs/promises";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const MEMORY_BASE_DIR = "/app/data/memory";

const StoreMemorySchema = Type.Object(
  {
    key: Type.String({ description: "Clave unica para identificar la memoria" }),
    value: Type.String({ description: "Valor a almacenar" }),
    namespace: Type.Optional(
      Type.String({ description: 'Espacio de nombres (default: "global")' }),
    ),
  },
  { additionalProperties: false },
);

export function createStoreMemoryTool(): AnyAgentTool {
  return {
    name: "jarvis_store_memory",
    label: "Jarvis Store Memory",
    description:
      "Almacena un par clave-valor en la memoria persistente de Jarvis (filesystem local).",
    parameters: StoreMemorySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const key = readStringParam(rawParams, "key", { required: true });
      const value = readStringParam(rawParams, "value", { required: true });
      const namespace = readStringParam(rawParams, "namespace") ?? "global";

      try {
        const dir = path.join(MEMORY_BASE_DIR, namespace);
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${key}.json`);
        const data = {
          key,
          value,
          namespace,
          updatedAt: new Date().toISOString(),
        };
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
        return jsonResult({ status: "ok", success: true, key, namespace });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
