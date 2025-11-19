import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";
import { createPrivateKey } from "node:crypto";
import type { Env } from "../../config";

/**
 * GitHub App Service
 * 
 * Handles authentication and API interactions with GitHub using a GitHub App.
 * This service:
 * 1. Creates JWTs signed with the GitHub App's private key
 * 2. Exchanges JWTs for short-lived installation access tokens
 * 3. Triggers repository_dispatch events to start GitHub Actions workflows
 */
export class GitHubService {
  constructor(private readonly env: Env) {}

  /**
   * Step 2a: Create a JWT signed with the GitHub App's private key
   * 
   * The JWT is used to authenticate as the GitHub App itself.
   * It's valid for 10 minutes and is used only to obtain installation tokens.
   */
  private createJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iat: now - 60, // Issued 60 seconds ago to account for clock drift
      exp: now + 600, // Expires in 10 minutes
      iss: this.env.GITHUB_APP_ID, // GitHub App ID
    };

    // Handle private key format - replace literal \n with actual newlines
    // Also remove quotes if they were included
    let privateKeyPem = this.env.GITHUB_APP_PRIVATE_KEY
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\\n/g, '\n') // Replace \n with actual newlines
      .trim();

    // Validate and create a proper KeyObject using Node.js crypto
    // Try different key types as GitHub may provide different formats
    let privateKey;
    try {
      // Try PKCS#8 format first (most common for new GitHub Apps)
      privateKey = createPrivateKey({
        key: privateKeyPem,
        format: 'pem',
        type: 'pkcs8'
      });
    } catch (error1) {
      try {
        // Try PKCS#1 format
        privateKey = createPrivateKey({
          key: privateKeyPem,
          format: 'pem',
          type: 'pkcs1'
        });
      } catch (error2) {
        // Try without specifying type (auto-detect)
        try {
          privateKey = createPrivateKey(privateKeyPem);
        } catch (error3) {
          console.error('Failed to create private key with all formats');
          console.error('PKCS#8 error:', error1);
          console.error('PKCS#1 error:', error2);
          console.error('Auto-detect error:', error3);
          console.error('Key starts with:', privateKeyPem.substring(0, 50));
          console.error('Key ends with:', privateKeyPem.substring(privateKeyPem.length - 50));
          console.error('Key length:', privateKeyPem.length);
          throw new Error('Invalid GitHub App private key format');
        }
      }
    }

    // Sign with RS256 algorithm using the private key
    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
    });
  }

  /**
   * Step 2b: Exchange JWT for an installation access token
   * 
   * Installation tokens are scoped to the repositories the app is installed on
   * and have the permissions configured in the GitHub App settings.
   * They expire after 1 hour.
   */
  private async getInstallationToken(): Promise<string> {
    const jwtToken = this.createJWT();
    
    const octokit = new Octokit({
      auth: jwtToken,
    });

    const { data } = await octokit.rest.apps.createInstallationAccessToken({
      installation_id: parseInt(this.env.GITHUB_APP_INSTALLATION_ID, 10),
    });

    return data.token;
  }

  /**
   * Step 2c: Trigger a repository_dispatch event
   * 
   * This creates a custom webhook event that can trigger GitHub Actions workflows.
   * The workflow in the target repo must use:
   * 
   * ```yaml
   * on:
   *   repository_dispatch:
   *     types: [agent-task]
   * ```
   * 
   * @param owner - Repository owner (username or organization)
   * @param repo - Repository name
   * @param eventType - Event type (e.g., 'agent-task')
   * @param payload - Custom payload data passed to the workflow
   */
  async dispatchWorkflow(
    owner: string,
    repo: string,
    eventType: string,
    payload: Record<string, any>
  ): Promise<void> {
    const token = await this.getInstallationToken();
    
    const octokit = new Octokit({
      auth: token,
    });

    await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: payload,
    });
  }

  /**
   * Helper: Get authenticated Octokit instance
   * Useful for other GitHub API operations
   */
  async getAuthenticatedClient(): Promise<Octokit> {
    const token = await this.getInstallationToken();
    return new Octokit({ auth: token });
  }

  /**
   * Step 5: Dispatch an agent task with structured payload
   * 
   * This is a convenience method that wraps dispatchWorkflow with
   * a standardized payload structure for agent tasks.
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param task - Agent task details
   */
  async dispatchAgentTask(
    owner: string,
    repo: string,
    task: {
      taskId: string;
      title: string;
      summary: string;
      acceptanceCriteria?: string;
      branch?: string;
      base: string;
    }
  ): Promise<void> {
    const branch = task.branch || `feature/agent-${task.taskId}`;
    
    const payload = {
      task_id: task.taskId,
      title: task.title,
      summary: task.summary,
      acceptance_criteria: task.acceptanceCriteria || "",
      branch,
      base: task.base,
    };

    await this.dispatchWorkflow(owner, repo, "agent-task", payload);
  }

  /**
   * Step 6: Create a GitHub issue for issues-driven workflow
   * 
   * Creates an issue with structured content and labels.
   * A workflow can then trigger on this issue to execute the agent task.
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issue - Issue details
   * @returns Created issue data (number, url, etc.)
   */
  async createIssue(
    owner: string,
    repo: string,
    issue: {
      taskId: string;
      title: string;
      body: string;
      acceptanceCriteria?: string[];
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<{
    number: number;
    url: string;
    html_url: string;
  }> {
    const octokit = await this.getAuthenticatedClient();

    // Build issue body with structured format
    let fullBody = `**Task ID:** ${issue.taskId}\n\n${issue.body}`;

    if (issue.acceptanceCriteria && issue.acceptanceCriteria.length > 0) {
      fullBody += "\n\n## Acceptance Criteria\n\n";
      fullBody += issue.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
    }

    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title: issue.title,
      body: fullBody,
      labels: issue.labels || ["agent-task"],
      assignees: issue.assignees,
    });

    return {
      number: data.number,
      url: data.url,
      html_url: data.html_url,
    };
  }
}
