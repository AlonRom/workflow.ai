import { type Env } from "../../config";
import type { JiraIssueRequest } from "./schema";

const ISSUE_TYPE_MAP: Record<
  JiraIssueRequest["workItemType"],
  { name: string }
> = {
  story: { name: "Story" },
  feature: { name: "Task" },
  epic: { name: "Epic" },
  bug: { name: "Bug" },
  issue: { name: "Task" },
};

export class JiraService {
  constructor(private readonly env: Env) {}

  private get authHeader() {
    const token = Buffer.from(
      `${this.env.JIRA_EMAIL}:${this.env.JIRA_API_TOKEN}`,
    ).toString("base64");
    return `Basic ${token}`;
  }

  async createIssue(payload: JiraIssueRequest) {
    const description = this.composeDescription(payload);

    const body = {
      fields: {
        project: { key: this.env.JIRA_PROJECT_KEY },
        summary: payload.title,
        issuetype: ISSUE_TYPE_MAP[payload.workItemType],
        description,
      },
    };

    const response = await fetch(
      `${this.env.JIRA_BASE_URL}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Jira responded with ${response.status}: ${response.statusText} - ${text}`,
      );
    }

    return (await response.json()) as { key: string; self: string };
  }

  private composeDescription(payload: JiraIssueRequest) {
    const content: any[] = [
      {
        type: "paragraph",
        content: [{ type: "text", text: payload.description }],
      },
    ];

    if (payload.acceptance.length > 0) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Acceptance Criteria" }],
      });
      content.push({
        type: "bulletList",
        content: payload.acceptance.map((criterion) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: criterion }],
            },
          ],
        })),
      });
    }

    return {
      type: "doc",
      version: 1,
      content,
    };
  }
}

