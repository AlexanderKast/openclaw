import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readStringArrayParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const UpdateEventSchema = Type.Object(
  {
    calendarId: Type.Optional(Type.String()),
    eventId: Type.String({ description: "ID del evento" }),
    title: Type.Optional(Type.String()),
    start: Type.Optional(Type.String()),
    end: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    attendees: Type.Optional(Type.Array(Type.String())),
    colorId: Type.Optional(Type.String()),
    account: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createUpdateCalendarEventTool(): AnyAgentTool {
  return {
    name: "jarvis_update_calendar_event",
    label: "Jarvis Update Calendar Event",
    description: "Actualiza un evento existente en Google Calendar.",
    parameters: UpdateEventSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const calendarId = readStringParam(rawParams, "calendarId") ?? "primary";
      const eventId = readStringParam(rawParams, "eventId", { required: true });
      const title = readStringParam(rawParams, "title");
      const start = readStringParam(rawParams, "start");
      const end = readStringParam(rawParams, "end");
      const description = readStringParam(rawParams, "description");
      const attendees = readStringArrayParam(rawParams, "attendees");
      const colorId = readStringParam(rawParams, "colorId");
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);
        const calId = encodeURIComponent(calendarId);

        const patch: Record<string, unknown> = {};
        if (title) patch.summary = title;
        if (start) patch.start = { dateTime: start, timeZone: "America/Bogota" };
        if (end) patch.end = { dateTime: end, timeZone: "America/Bogota" };
        if (description !== undefined && description !== null) patch.description = description;
        if (colorId) patch.colorId = colorId;
        if (attendees) patch.attendees = attendees.map((email) => ({ email }));

        const { data } = await axios.patch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`,
          patch,
          {
            params: { sendNotifications: true },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        return jsonResult({
          status: "ok",
          eventId: data.id,
          htmlLink: data.htmlLink,
          summary: data.summary,
          start: data.start,
          end: data.end,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
