import { z } from "zod";

/**
 * Schema for dispatching a GitHub Actions workflow
 */
export const githubDispatchRequestSchema = z.object({
  owner: z
    .string()
    .min(1)
    .default("workflowai-hackaton")
    .describe("Repository owner (username or organization)"),
  repo: z
    .string()
    .min(1)
    .default("hackaton-demo-calculator")
    .describe("Repository name"),
  eventType: z
    .string()
    .min(1)
    .default("agent-task")
    .describe("Event type that triggers the workflow (e.g., 'agent-task')"),
  payload: z
    .record(z.any())
    .describe("Custom payload passed to the GitHub Actions workflow"),
});

export type GitHubDispatchRequest = z.infer<
  typeof githubDispatchRequestSchema
>;

/**
 * Schema for dispatching an agent task (Step 5)
 * This is a structured version of the dispatch request for work items
 */
export const agentTaskDispatchSchema = z.object({
  owner: z
    .string()
    .min(1)
    .default("workflowai-hackaton")
    .describe("Repository owner"),
  repo: z
    .string()
    .min(1)
    .default("hackaton-demo-calculator")
    .describe("Repository name"),
  taskId: z.string().min(1).describe("Work item/task ID (e.g., 'TASK-123')"),
  title: z.string().min(1).describe("Task title"),
  summary: z.string().min(1).describe("Detailed task description"),
  acceptanceCriteria: z
    .string()
    .optional()
    .describe("Acceptance criteria for the task"),
  branch: z
    .string()
    .optional()
    .describe("Target branch name (defaults to feature/agent-{taskId})"),
  base: z.string().default("main").describe("Base branch to create PR against"),
});

export type AgentTaskDispatch = z.infer<typeof agentTaskDispatchSchema>;

/**
 * Schema for creating a GitHub issue (Step 6 - issues-driven flow)
 */
export const githubIssueCreateSchema = z.object({
  owner: z
    .string()
    .min(1)
    .default("workflowai-hackaton")
    .describe("Repository owner"),
  repo: z
    .string()
    .min(1)
    .default("hackaton-demo-calculator")
    .describe("Repository name"),
  taskId: z.string().min(1).describe("Work item/task ID"),
  title: z.string().min(1).describe("Issue title"),
  body: z.string().min(1).describe("Issue description/body"),
  acceptanceCriteria: z
    .array(z.string())
    .optional()
    .describe("List of acceptance criteria"),
  labels: z
    .array(z.string())
    .default(["agent-task"])
    .describe("Labels to apply to the issue"),
  assignees: z
    .array(z.string())
    .optional()
    .describe("GitHub usernames to assign"),
});

export type GitHubIssueCreate = z.infer<typeof githubIssueCreateSchema>;

