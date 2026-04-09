import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  getGoogleAccessToken,
  listAccounts,
} from "../../../legacy/shared/google-api.js";

const ListCalendarsSchema = Type.Object(
  {
    account: Type.Optional(
      Type.String({ description: "Cuenta o 'all' (default all)" }),
    ),
  },
  { additionalProperties: false },
);

export function createListCalendarsTool(): AnyAgentTool {
  return {
    name: "jarvis_list_calendars",
    label: "Jarvis List Calendars",
    description: "Lista calendarios accesibles por una o todas las cuentas Google conectadas.",
    parameters: ListCalendarsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "all";

      try {
        const allAccounts = listAccounts();
        const accountKeys: string[] =
          account === "all" ? Object.keys(allAccounts) : [account];

        const results: Record<string, unknown[]> = {};

        for (const acc of accountKeys) {
          try {
            const accessToken = await getGoogleAccessToken(acc);
            const { data } = await axios.get(
              "https://www.googleapis.com/calendar/v3/users/me/calendarList",
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );

            results[acc] = (data.items ?? [])
              .filter((cal: Record<string, unknown>) => {
                const id = (cal.id as string) || "";
                return (
                  !id.includes("#holiday") &&
                  !id.includes("#contacts") &&
                  !id.includes("addressbook") &&
                  !id.includes("#weather")
                );
              })
              .map((cal: Record<string, unknown>) => ({
                id: cal.id,
                name: cal.summary,
                description: cal.description || null,
                primary: cal.primary || false,
                accessRole: cal.accessRole,
                backgroundColor: cal.backgroundColor,
              }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            results[acc] = [{ error: `No se pudo acceder: ${msg}` }];
          }
        }

        return jsonResult({ status: "ok", calendars: results });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
