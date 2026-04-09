import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const CreateCalendarSchema = Type.Object(
  {
    name: Type.String({ description: "Nombre del calendario" }),
    description: Type.Optional(Type.String()),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createCreateCalendarTool(): AnyAgentTool {
  return {
    name: "jarvis_create_calendar",
    label: "Jarvis Create Calendar",
    description: "Crea un nuevo calendario en Google Calendar.",
    parameters: CreateCalendarSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const name = readStringParam(rawParams, "name", { required: true });
      const description = readStringParam(rawParams, "description");
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);

        const { data } = await axios.post(
          "https://www.googleapis.com/calendar/v3/calendars",
          {
            summary: name,
            description: description || undefined,
            timeZone: "America/Bogota",
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        return jsonResult({
          status: "ok",
          calendarId: data.id,
          name: data.summary,
          description: data.description || null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
