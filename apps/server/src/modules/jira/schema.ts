import { z } from "zod";

export const jiraIssueRequestSchema = z.object({
  workItemType: z.enum(["story", "feature", "epic", "bug", "issue"]),
  title: z.string().min(1),
  description: z.string().min(1),
  acceptance: z.array(z.string()).default([]),
});

export type JiraIssueRequest = z.infer<typeof jiraIssueRequestSchema>;

export const jiraInsightsRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

export type JiraInsightsRequest = z.infer<typeof jiraInsightsRequestSchema>;

export type JiraInsight = {
  id: string;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  trend: number;
  impact: string;
  recommendations: string[];
  lastUpdated: string;
};

export type JiraInsightsResponse = {
  query: string;
  generatedAt: string;
  results: JiraInsight[];
};

