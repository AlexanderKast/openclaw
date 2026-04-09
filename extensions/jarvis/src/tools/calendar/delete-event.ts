import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const DeleteEventSchema = Type.Object(
  {
    calendarId: Type.Optional(Type.String()),
    eventId: Type.String({ description: "ID del evento" }),
    account: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createDeleteCalendarEventTool(): AnyAgentTool {
  return {
    name: "jarvis_delete_calendar_event",
    label: "Jarvis Delete Calendar Event",
    description: "Elimina un evento de Google Calendar.",
    parameters: DeleteEventSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const calendarId = readStringParam(rawParams, "calendarId") ?? "primary";
      const eventId = readStringParam(rawParams, "eventId", { required: true });
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);
        const calId = encodeURIComponent(calendarId);

        await axios.delete(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`,
          {
            params: { sendNotifications: true },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        return jsonResult({ status: "ok", eventId, deleted: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
