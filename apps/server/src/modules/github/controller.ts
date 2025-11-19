import type { FastifyInstance } from "fastify";
import {
  githubDispatchRequestSchema,
  agentTaskDispatchSchema,
  githubIssueCreateSchema,
} from "./schema";
import { GitHubService } from "./service";
import { loadConfig } from "../../config";

const config = loadConfig();
const githubService = new GitHubService(config);

/**
 * Register GitHub routes
 * 
 * Provides endpoints for triggering GitHub Actions workflows via repository_dispatch events
 */
export async function registerGithubRoutes(app: FastifyInstance) {
  /**
   * POST /api/github/dispatch
   * 
   * Triggers a repository_dispatch event to start a GitHub Actions workflow.
   * 
   * Example request body:
   * {
   *   "owner": "your-org",
   *   "repo": "your-repo",
   *   "eventType": "agent-task",
   *   "payload": {
   *     "taskId": "123",
   *     "description": "Add user authentication",
   *     "files": ["src/auth/login.ts"]
   *   }
   * }
   * 
   * The target repository must have a workflow that listens for this event:
   * 
   * ```yaml
   * name: Agent Task
   * on:
   *   repository_dispatch:
   *     types: [agent-task]
   * 
   * jobs:
   *   execute:
   *     runs-on: ubuntu-latest
   *     steps:
   *       - uses: actions/checkout@v4
   *       - name: Run task
   *         run: |
   *           echo "Task ID: ${{ github.event.client_payload.taskId }}"
   *           # Your automation logic here
   * ```
   */
  app.post("/api/github/dispatch", async (request, reply) => {
    const parsed = githubDispatchRequestSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    const { owner, repo, eventType, payload } = parsed.data;

    try {
      await githubService.dispatchWorkflow(owner, repo, eventType, payload);
      
      return reply.send({
        success: true,
        message: `Workflow dispatched successfully to ${owner}/${repo}`,
        eventType,
      });
    } catch (error) {
      request.log.error(error);
      
      return reply.status(502).send({
        error: "GITHUB_DISPATCH_FAILED",
        message: "Unable to dispatch workflow to GitHub.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/github/tasks
   * 
   * Step 5: Dispatch an agent task with structured work item payload
   * 
   * This endpoint provides a work-item-centric interface for triggering agent tasks.
   * It takes work item details and dispatches a repository_dispatch event with a
   * standardized payload structure.
   * 
   * Example request body:
   * {
   *   "owner": "your-org",
   *   "repo": "your-repo",
   *   "taskId": "TASK-123",
   *   "title": "Add health endpoint",
   *   "summary": "Create GET /health returning JSON {status:'ok'} and tests",
   *   "acceptanceCriteria": "- Returns 200\n- Unit tests pass",
   *   "branch": "feature/agent-TASK-123",
   *   "base": "main"
   * }
   * 
   * The workflow will receive client_payload with these fields transformed to snake_case.
   */
  app.post("/api/github/tasks", async (request, reply) => {
    const parsed = agentTaskDispatchSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    const { owner, repo, ...task } = parsed.data;

    try {
      await githubService.dispatchAgentTask(owner, repo, task);

      return reply.send({
        success: true,
        message: `Agent task dispatched successfully to ${owner}/${repo}`,
        taskId: task.taskId,
        branch: task.branch || `feature/agent-${task.taskId}`,
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "GITHUB_TASK_DISPATCH_FAILED",
        message: "Unable to dispatch agent task to GitHub.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/github/issues
   * 
   * Step 6: Create a GitHub issue for issues-driven workflow
   * 
   * This endpoint creates a GitHub issue with structured content and labels.
   * A workflow in the target repo can trigger on issues with the 'agent-task' label
   * to automatically execute the task and create a PR.
   * 
   * Example request body:
   * {
   *   "owner": "your-org",
   *   "repo": "your-repo",
   *   "taskId": "TASK-123",
   *   "title": "Add health endpoint",
   *   "body": "Create GET /health returning JSON {status:'ok'} and tests",
   *   "acceptanceCriteria": [
   *     "Returns 200 status code",
   *     "Unit tests pass",
   *     "Integration tests pass"
   *   ],
   *   "labels": ["agent-task", "enhancement"],
   *   "assignees": ["username"]
   * }
   * 
   * Benefits of issues-driven flow:
   * - Provides visibility and audit trail in GitHub
   * - Allows team collaboration on task definition
   * - Enables manual review before automation
   */
  app.post("/api/github/issues", async (request, reply) => {
    const parsed = githubIssueCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    const { owner, repo, ...issue } = parsed.data;

    try {
      const createdIssue = await githubService.createIssue(owner, repo, issue);

      return reply.send({
        success: true,
        message: `Issue created successfully in ${owner}/${repo}`,
        issue: {
          number: createdIssue.number,
          url: createdIssue.html_url,
        },
        taskId: issue.taskId,
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "GITHUB_ISSUE_CREATE_FAILED",
        message: "Unable to create GitHub issue.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
