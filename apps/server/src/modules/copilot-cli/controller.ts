import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CopilotCLIService } from "./service";

const copilotCLI = new CopilotCLIService();

/**
 * Schema for running a Copilot CLI prompt
 */
const runPromptSchema = z.object({
  prompt: z.string().min(1).describe("The task description for Copilot"),
  allowAllTools: z.boolean().optional().describe("Allow Copilot to use any tool without approval"),
  allowTools: z.array(z.string()).optional().describe("Specific tools to allow (e.g., ['shell(git)', 'write'])"),
  denyTools: z.array(z.string()).optional().describe("Specific tools to deny (e.g., ['shell(rm)'])"),
  workingDirectory: z.string().optional().describe("Directory to run the command in"),
});

/**
 * Schema for creating a PR
 */
const createPRSchema = z.object({
  // Accept either 'prompt' or 'description' for backwards compatibility
  prompt: z.string().min(1).optional().describe("What changes to make"),
  description: z.string().min(1).optional().describe("What changes to make (alias for prompt)"),
  title: z.string().optional().describe("Task title"),
  owner: z.string().optional().describe("Repository owner"),
  repo: z.string().optional().describe("Repository name"),
  repository: z.string().optional().describe("Target repository (e.g., 'owner/repo')"),
  workingDirectory: z.string().optional().describe("Local repository directory"),
  allowAllTools: z.boolean().optional().describe("Allow Copilot to use any tool"),
}).refine(
  (data) => data.prompt || data.description,
  { message: "Either 'prompt' or 'description' is required" }
);

/**
 * Register Copilot CLI routes
 */
export async function registerCopilotCLIRoutes(app: FastifyInstance) {
  /**
   * GET /api/copilot-cli/check
   * 
   * Check if Copilot CLI is installed and ready to use
   */
  app.get("/api/copilot-cli/check", async (request, reply) => {
    const status = await copilotCLI.checkAvailability();

    if (!status.available) {
      return reply.status(503).send({
        ...status,
        setupInstructions: [
          !status.ghInstalled && "Install GitHub CLI: brew install gh",
          !status.authenticated && "Authenticate: gh auth login",
          !status.copilotInstalled && "Install Copilot CLI: gh extension install github/gh-copilot",
        ].filter(Boolean),
      });
    }

    return reply.send({
      message: "Copilot CLI is ready to use",
      ...status,
    });
  });

  /**
   * POST /api/copilot-cli/prompt
   * 
   * Run a Copilot CLI prompt in programmatic mode
   * 
   * Example:
   * {
   *   "prompt": "Revert the last commit, leaving changes unstaged",
   *   "allowAllTools": true,
   *   "workingDirectory": "/path/to/repo"
   * }
   */
  app.post("/api/copilot-cli/prompt", async (request, reply) => {
    const parsed = runPromptSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    // Check if CLI is available
    const status = await copilotCLI.checkAvailability();
    if (!status.available) {
      return reply.status(503).send({
        error: "COPILOT_CLI_NOT_AVAILABLE",
        message: status.error || "Copilot CLI is not available",
        setupInstructions: [
          !status.ghInstalled && "Install GitHub CLI: brew install gh",
          !status.authenticated && "Authenticate: gh auth login",
          !status.copilotInstalled && "Install Copilot CLI: gh extension install github/gh-copilot",
        ].filter(Boolean),
      });
    }

    try {
      const result = await copilotCLI.runPrompt(parsed.data.prompt, {
        allowAllTools: parsed.data.allowAllTools,
        allowTools: parsed.data.allowTools,
        denyTools: parsed.data.denyTools,
        workingDirectory: parsed.data.workingDirectory,
      });

      if (!result.success) {
        return reply.status(500).send({
          error: "COPILOT_CLI_EXECUTION_FAILED",
          message: result.error || "Failed to execute Copilot CLI command",
        });
      }

      return reply.send({
        success: true,
        output: result.output,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: "COPILOT_CLI_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/copilot-cli/create-pr
   * 
   * Ask Copilot to make changes and create a pull request
   * 
   * Example:
   * {
   *   "prompt": "Add multiplication functionality with tests",
   *   "repository": "owner/repo",
   *   "workingDirectory": "/path/to/local/repo"
   * }
   */
  app.post("/api/copilot-cli/create-pr", async (request, reply) => {
    const parsed = createPRSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    // Check if CLI is available
    const status = await copilotCLI.checkAvailability();
    if (!status.available) {
      return reply.status(503).send({
        error: "COPILOT_CLI_NOT_AVAILABLE",
        message: status.error || "Copilot CLI is not available",
      });
    }

    try {
      // Use 'description' field if 'prompt' is not provided (for Jira integration)
      const taskDescription = parsed.data.prompt || parsed.data.description || "";
      
      // Build repository string from owner/repo or use full repository string
      let repositoryStr = parsed.data.repository;
      if (!repositoryStr && parsed.data.owner && parsed.data.repo) {
        repositoryStr = `${parsed.data.owner}/${parsed.data.repo}`;
      }
      
      const result = await copilotCLI.makeChangesAndCreatePR(
        taskDescription,
        repositoryStr || "current repository",
        parsed.data.workingDirectory
      );

      if (!result.success) {
        return reply.status(500).send({
          error: "PR_CREATION_FAILED",
          message: result.error || "Failed to create pull request",
        });
      }

      return reply.send({
        success: true,
        output: result.output,
        prUrl: result.prUrl,
        message: result.prUrl
          ? `Pull request created: ${result.prUrl}`
          : "Command executed successfully (check output for details)",
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: "COPILOT_CLI_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
