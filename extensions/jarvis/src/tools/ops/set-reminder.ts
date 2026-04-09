import fs from "fs/promises";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const SetReminderSchema = Type.Object(
  {
    text: Type.String(),
    when: Type.String({ description: "ISO 8601" }),
    recurring: Type.Optional(Type.String({ description: "Cron expression opcional" })),
    phone: Type.Optional(Type.String({ description: "Telefono destino (opcional)" })),
  },
  { additionalProperties: false },
);

export function createSetReminderTool(): AnyAgentTool {
  return {
    name: "jarvis_set_reminder",
    label: "Jarvis Set Reminder",
    description: "Crea un recordatorio que sera enviado por WhatsApp a la hora indicada.",
    parameters: SetReminderSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const text = readStringParam(rawParams, "text") ?? "";
      const when = readStringParam(rawParams, "when") ?? "";
      const recurring = readStringParam(rawParams, "recurring");
      const phone = readStringParam(rawParams, "phone") ?? "";
      try {
        const remindersPath = "/app/data/reminders.json";
        let reminders: unknown[] = [];
        try {
          await fs.mkdir(path.dirname(remindersPath), { recursive: true });
          const content = await fs.readFile(remindersPath, "utf-8");
          reminders = JSON.parse(content);
        } catch {
          reminders = [];
        }
        const newReminder = {
          id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          text,
          triggerAt: when,
          phone,
          recurring: recurring ?? null,
          sent: false,
          createdAt: new Date().toISOString(),
          source: "manual" as const,
        };
        reminders.push(newReminder);
        await fs.writeFile(remindersPath, JSON.stringify(reminders, null, 2), "utf-8");
        return jsonResult({ status: "ok", reminder: newReminder });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
