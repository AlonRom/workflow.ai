import { Octokit } from "@octokit/rest";
import { loadConfig } from "../../config";

const config = loadConfig();

/**
 * GitHub Copilot Coding Agent Service
 * 
 * Triggers GitHub's official Copilot coding agent to work on tasks autonomously.
 * Unlike repository_dispatch (which requires you to build the automation), this
 * uses GitHub's hosted AI to write code, create PRs, and iterate based on reviews.
 * 
 * Prerequisites:
 * - GitHub Copilot Pro, Business, or Enterprise subscription
 * - Copilot coding agent enabled in target repository
 * - User token with 'repo' scope (not GitHub App token)
 */
export class CopilotService {
  private octokit: Octokit;

  constructor() {
    // Must use a user token, not a GitHub App token
    // Copilot coding agent only works with user authentication
    if (!process.env.GITHUB_USER_TOKEN) {
      throw new Error(
        "GITHUB_USER_TOKEN is required for Copilot coding agent. " +
        "Create a personal access token at: https://github.com/settings/tokens"
      );
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_USER_TOKEN,
    });
  }

  /**
   * Get Copilot's bot ID for a repository
   * 
   * This checks if Copilot coding agent is enabled and returns its ID.
   */
  private async getCopilotBotId(
    owner: string,
    repo: string
  ): Promise<string> {
    const query = `
      query {
        repository(owner: "${owner}", name: "${repo}") {
          suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
            nodes {
              login
              __typename
              ... on Bot {
                id
              }
            }
          }
        }
      }
    `;

    const response: any = await this.octokit.graphql(query);
    
    const copilot = response.repository.suggestedActors.nodes.find(
      (node: any) => node.login === "copilot-swe-agent"
    );

    if (!copilot) {
      throw new Error(
        `Copilot coding agent is not enabled for ${owner}/${repo}. ` +
        "Please enable it in repository settings."
      );
    }

    return copilot.id;
  }

  /**
   * Get repository's GraphQL global ID
   */
  private async getRepositoryId(
    owner: string,
    repo: string
  ): Promise<string> {
    const query = `
      query {
        repository(owner: "${owner}", name: "${repo}") {
          id
        }
      }
    `;

    const response: any = await this.octokit.graphql(query);
    return response.repository.id;
  }

  /**
   * Create a GitHub issue and assign it to Copilot coding agent
   * 
   * Copilot will:
   * 1. Read the issue title and body
   * 2. Create a new branch
   * 3. Write code to implement the feature
   * 4. Create a pull request
   * 5. Request your review
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param title - Issue title (becomes PR title)
   * @param body - Issue description with requirements
   * @param labels - Optional labels for the issue
   * @returns Created issue details with Copilot assigned
   */
  async assignTaskToCopilot(
    owner: string,
    repo: string,
    task: {
      title: string;
      body: string;
      labels?: string[];
      additionalInstructions?: string;
    }
  ): Promise<{
    issueNumber: number;
    issueUrl: string;
    assignedTo: string;
  }> {
    // Get required IDs
    const [repositoryId, copilotBotId] = await Promise.all([
      this.getRepositoryId(owner, repo),
      this.getCopilotBotId(owner, repo),
    ]);

    // Build issue body with additional instructions
    let issueBody = task.body;
    if (task.additionalInstructions) {
      issueBody += `\n\n---\n\n**Additional Instructions for Copilot:**\n${task.additionalInstructions}`;
    }

    // Create issue and assign to Copilot using GraphQL
    const mutation = `
      mutation {
        createIssue(input: {
          repositoryId: "${repositoryId}",
          title: ${JSON.stringify(task.title)},
          body: ${JSON.stringify(issueBody)},
          assigneeIds: ["${copilotBotId}"]
        }) {
          issue {
            id
            number
            url
            assignees(first: 10) {
              nodes {
                login
              }
            }
          }
        }
      }
    `;

    const response: any = await this.octokit.graphql(mutation);
    const issue = response.createIssue.issue;

    // Add labels if provided (using REST API)
    if (task.labels && task.labels.length > 0) {
      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issue.number,
        labels: task.labels,
      });
    }

    return {
      issueNumber: issue.number,
      issueUrl: issue.url,
      assignedTo: issue.assignees.nodes[0]?.login || "copilot-swe-agent",
    };
  }

  /**
   * Assign an existing issue to Copilot coding agent
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Existing issue number
   * @returns Updated issue details
   */
  async assignExistingIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{
    issueNumber: number;
    issueUrl: string;
    assignedTo: string;
  }> {
    // Get Copilot's bot ID
    const copilotBotId = await this.getCopilotBotId(owner, repo);

    // Get issue's GraphQL ID
    const issueQuery = `
      query {
        repository(owner: "${owner}", name: "${repo}") {
          issue(number: ${issueNumber}) {
            id
            url
          }
        }
      }
    `;

    const issueResponse: any = await this.octokit.graphql(issueQuery);
    const issueId = issueResponse.repository.issue.id;
    const issueUrl = issueResponse.repository.issue.url;

    // Assign to Copilot
    const mutation = `
      mutation {
        replaceActorsForAssignable(input: {
          assignableId: "${issueId}",
          actorIds: ["${copilotBotId}"]
        }) {
          assignable {
            ... on Issue {
              id
              assignees(first: 10) {
                nodes {
                  login
                }
              }
            }
          }
        }
      }
    `;

    const response: any = await this.octokit.graphql(mutation);
    const assignees = response.replaceActorsForAssignable.assignable.assignees.nodes;

    return {
      issueNumber,
      issueUrl,
      assignedTo: assignees[0]?.login || "copilot-swe-agent",
    };
  }

  /**
   * Check if Copilot coding agent is available in a repository
   */
  async isCopilotAvailable(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getCopilotBotId(owner, repo);
      return true;
    } catch {
      return false;
    }
  }
}
