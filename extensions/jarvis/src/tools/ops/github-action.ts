import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { config } from "../../../legacy/shared/config.js";

const GithubActionSchema = Type.Object(
  {
    action: Type.String({ description: "repos | issues | commits | create_issue" }),
    repo: Type.Optional(Type.String({ description: "owner/repo" })),
    title: Type.Optional(Type.String()),
    body: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createGithubActionTool(): AnyAgentTool {
  return {
    name: "jarvis_github_action",
    label: "Jarvis GitHub Action",
    description: "Opera sobre GitHub: listar repos, issues, commits o crear issues.",
    parameters: GithubActionSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const action = readStringParam(rawParams, "action") ?? "";
      const repo = readStringParam(rawParams, "repo");
      const title = readStringParam(rawParams, "title");
      const body = readStringParam(rawParams, "body") ?? "";
      try {
        if (!config.github?.token) {
          return jsonResult({ status: "failed", error: "GITHUB_TOKEN no configurado" });
        }
        const headers = {
          Authorization: `Bearer ${config.github.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        };
        const base = "https://api.github.com";

        switch (action) {
          case "repos": {
            const { data } = await axios.get(`${base}/user/repos`, {
              headers,
              params: { sort: "updated", per_page: 20 },
            });
            return jsonResult({
              status: "ok",
              repos: (data as Array<Record<string, unknown>>).map((r) => ({
                name: r.name,
                full_name: r.full_name,
                description: r.description,
                updated_at: r.updated_at,
                open_issues_count: r.open_issues_count,
              })),
            });
          }
          case "issues": {
            if (!repo) return jsonResult({ status: "failed", error: "repo requerido" });
            const { data } = await axios.get(`${base}/repos/${repo}/issues`, {
              headers,
              params: { state: "open", per_page: 20 },
            });
            return jsonResult({
              status: "ok",
              issues: (data as Array<Record<string, unknown>>).map((i) => ({
                number: i.number,
                title: i.title,
                state: i.state,
                created_at: i.created_at,
                html_url: i.html_url,
              })),
            });
          }
          case "commits": {
            if (!repo) return jsonResult({ status: "failed", error: "repo requerido" });
            const { data } = await axios.get(`${base}/repos/${repo}/commits`, {
              headers,
              params: { per_page: 10 },
            });
            return jsonResult({
              status: "ok",
              commits: (data as Array<Record<string, unknown>>).map((c) => {
                const commit = c.commit as Record<string, unknown> | undefined;
                const author = commit?.author as Record<string, unknown> | undefined;
                return {
                  sha: (c.sha as string)?.slice(0, 7),
                  message: commit?.message,
                  author: author?.name,
                  date: author?.date,
                };
              }),
            });
          }
          case "create_issue": {
            if (!repo) return jsonResult({ status: "failed", error: "repo requerido" });
            if (!title) return jsonResult({ status: "failed", error: "title requerido" });
            const { data } = await axios.post(
              `${base}/repos/${repo}/issues`,
              { title, body },
              { headers },
            );
            return jsonResult({
              status: "ok",
              number: data.number,
              html_url: data.html_url,
              title: data.title,
            });
          }
          default:
            return jsonResult({ status: "failed", error: `Unknown action: ${action}` });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
