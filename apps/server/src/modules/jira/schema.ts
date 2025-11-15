import { z } from "zod";

export const jiraIssueRequestSchema = z.object({
  workItemType: z.enum(["story", "feature", "epic", "bug", "issue"]),
  title: z.string().min(1),
  description: z.string().min(1),
  acceptance: z.array(z.string()).default([]),
});

export type JiraIssueRequest = z.infer<typeof jiraIssueRequestSchema>;

