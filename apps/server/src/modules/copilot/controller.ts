import type { FastifyInstance } from "fastify";
import { copilotTaskSchema, copilotAssignExistingSchema } from "./schema";
import { CopilotService } from "./service";

/**
 * Register Copilot Coding Agent routes
 * 
 * Provides endpoints for triggering GitHub's official Copilot coding agent
 */
export async function registerCopilotRoutes(app: FastifyInstance) {
  let copilotService: CopilotService;

  try {
    copilotService = new CopilotService();
  } catch (error) {
    app.log.warn(
      "Copilot service not available. GITHUB_USER_TOKEN not configured. " +
      "Copilot routes will return 503."
    );
  }

  /**
   * POST /api/copilot/tasks
   * 
   * Assign a new task to GitHub Copilot coding agent
   * 
   * This creates a GitHub issue and assigns it to Copilot, which will:
   * 1. Analyze the requirements
   * 2. Create a feature branch
   * 3. Write the code autonomously
   * 4. Open a pull request
   * 5. Request your review
   * 
   * Example request:
   * {
   *   "owner": "your-org",
   *   "repo": "your-repo",
   *   "title": "Add user authentication",
   *   "body": "Implement OAuth2 login with Google and GitHub providers. Include:\n- Login/logout endpoints\n- Session management\n- User profile API\n- Comprehensive tests",
   *   "labels": ["enhancement", "ai-generated"],
   *   "additionalInstructions": "Use Passport.js for OAuth. Follow our existing API patterns in src/api/"
   * }
   * 
   * Benefits over repository_dispatch:
   * - No need to write GitHub Actions workflows
   * - Copilot autonomously writes the code using AI
   * - Handles complex requirements and edge cases
   * - Iterates based on your PR review comments
   * - Validates security issues before completing
   */
  app.post("/api/copilot/tasks", async (request, reply) => {
    if (!copilotService) {
      return reply.status(503).send({
        error: "COPILOT_NOT_CONFIGURED",
        message:
          "Copilot coding agent requires GITHUB_USER_TOKEN environment variable. " +
          "Create a personal access token at: https://github.com/settings/tokens",
      });
    }

    const parsed = copilotTaskSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    const { owner, repo, ...task } = parsed.data;

    try {
      // Check if Copilot is available
      const available = await copilotService.isCopilotAvailable(owner, repo);
      if (!available) {
        return reply.status(400).send({
          error: "COPILOT_NOT_ENABLED",
          message:
            `Copilot coding agent is not enabled for ${owner}/${repo}. ` +
            "Enable it in repository settings: Settings → Code & automation → Copilot",
        });
      }

      // Assign task to Copilot
      const result = await copilotService.assignTaskToCopilot(
        owner,
        repo,
        task
      );

      return reply.send({
        success: true,
        message: `Task assigned to Copilot coding agent. Copilot will create a PR when ready.`,
        issue: {
          number: result.issueNumber,
          url: result.issueUrl,
          assignedTo: result.assignedTo,
        },
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "COPILOT_ASSIGNMENT_FAILED",
        message: "Unable to assign task to Copilot coding agent.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/copilot/assign-existing
   * 
   * Assign an existing GitHub issue to Copilot coding agent
   * 
   * Example request:
   * {
   *   "owner": "your-org",
   *   "repo": "your-repo",
   *   "issueNumber": 42
   * }
   */
  app.post("/api/copilot/assign-existing", async (request, reply) => {
    if (!copilotService) {
      return reply.status(503).send({
        error: "COPILOT_NOT_CONFIGURED",
        message: "Copilot coding agent requires GITHUB_USER_TOKEN.",
      });
    }

    const parsed = copilotAssignExistingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    const { owner, repo, issueNumber } = parsed.data;

    try {
      const result = await copilotService.assignExistingIssue(
        owner,
        repo,
        issueNumber
      );

      return reply.send({
        success: true,
        message: `Issue #${issueNumber} assigned to Copilot coding agent.`,
        issue: {
          number: result.issueNumber,
          url: result.issueUrl,
          assignedTo: result.assignedTo,
        },
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "COPILOT_ASSIGNMENT_FAILED",
        message: "Unable to assign issue to Copilot.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/copilot/check/:owner/:repo
   * 
   * Check if Copilot coding agent is available in a repository
   */
  app.get("/api/copilot/check/:owner/:repo", async (request, reply) => {
    if (!copilotService) {
      return reply.status(503).send({
        error: "COPILOT_NOT_CONFIGURED",
        message: "Copilot coding agent requires GITHUB_USER_TOKEN.",
      });
    }

    const { owner, repo } = request.params as { owner: string; repo: string };

    try {
      const available = await copilotService.isCopilotAvailable(owner, repo);

      return reply.send({
        available,
        repository: `${owner}/${repo}`,
        message: available
          ? "Copilot coding agent is enabled and ready"
          : "Copilot coding agent is not enabled for this repository",
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "CHECK_FAILED",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
