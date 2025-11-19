import { z } from "zod";

/**
 * Schema for assigning a task to Copilot coding agent
 */
export const copilotTaskSchema = z.object({
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
  
  title: z
    .string()
    .min(1)
    .describe("Task title (becomes the issue title and PR title)"),
  
  body: z
    .string()
    .min(1)
    .describe("Detailed description of what Copilot should implement"),
  
  labels: z
    .array(z.string())
    .optional()
    .describe("Optional labels for the issue (e.g., ['enhancement', 'ai-generated'])"),
  
  additionalInstructions: z
    .string()
    .optional()
    .describe("Additional context or constraints for Copilot (coding patterns, testing requirements, etc.)"),
});

export type CopilotTask = z.infer<typeof copilotTaskSchema>;

/**
 * Schema for assigning an existing issue to Copilot
 */
export const copilotAssignExistingSchema = z.object({
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
  
  issueNumber: z
    .number()
    .int()
    .positive()
    .describe("Existing issue number to assign to Copilot"),
});

export type CopilotAssignExisting = z.infer<typeof copilotAssignExistingSchema>;
