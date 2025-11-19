import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * GitHub Copilot CLI Service
 * 
 * Runs Copilot CLI commands directly from the server.
 * This uses the `copilot` command-line tool in programmatic mode.
 * 
 * Prerequisites:
 * - GitHub CLI (gh) installed: brew install gh
 * - Copilot CLI extension installed: gh extension install github/gh-copilot
 * - Authenticated: gh auth login
 * - Copilot subscription (Pro/Business/Enterprise)
 */
export class CopilotCLIService {
  /**
   * Check if Copilot CLI is installed and authenticated
   */
  async checkAvailability(): Promise<{
    available: boolean;
    ghInstalled: boolean;
    copilotInstalled: boolean;
    authenticated: boolean;
    error?: string;
  }> {
    try {
      // Check if gh CLI is installed
      try {
        await execAsync("gh --version");
      } catch {
        return {
          available: false,
          ghInstalled: false,
          copilotInstalled: false,
          authenticated: false,
          error: "GitHub CLI (gh) is not installed. Run: brew install gh",
        };
      }

      // Check if authenticated
      try {
        await execAsync("gh auth status");
      } catch {
        return {
          available: false,
          ghInstalled: true,
          copilotInstalled: false,
          authenticated: false,
          error: "Not authenticated. Run: gh auth login",
        };
      }

      // Check if copilot CLI is available
      try {
        await execAsync("copilot --version");
      } catch {
        return {
          available: false,
          ghInstalled: true,
          copilotInstalled: false,
          authenticated: true,
          error: "Copilot CLI not installed. Run: gh extension install github/gh-copilot",
        };
      }

      return {
        available: true,
        ghInstalled: true,
        copilotInstalled: true,
        authenticated: true,
      };
    } catch (error) {
      return {
        available: false,
        ghInstalled: false,
        copilotInstalled: false,
        authenticated: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run Copilot CLI in programmatic mode with a prompt
   * 
   * This executes: copilot -p "prompt" [options]
   * 
   * @param prompt - The task description for Copilot
   * @param options - CLI options
   * @returns Command output
   */
  async runPrompt(
    prompt: string,
    options: {
      allowAllTools?: boolean;
      allowTools?: string[];
      denyTools?: string[];
      workingDirectory?: string;
    } = {}
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    try {
      // Execute command with live output
      const execOptions = options.workingDirectory
        ? { cwd: options.workingDirectory }
        : {};

      return new Promise((resolve) => {
        const args = ['-p', prompt];
        
        if (options.allowAllTools) {
          args.push('--allow-all-tools');
        }
        
        if (options.allowTools && options.allowTools.length > 0) {
          args.push('--allow-tool');
          args.push(...options.allowTools);
        }
        
        if (options.denyTools && options.denyTools.length > 0) {
          args.push('--deny-tool');
          args.push(...options.denyTools);
        }

        const child = spawn('copilot', args, {
          cwd: execOptions.cwd,
        });

        let output = '';
        let errorOutput = '';

        // Stream stdout to console and capture it
        child.stdout?.on('data', (data) => {
          const text = data.toString();
          console.log('[COPILOT]', text);
          output += text;
        });

        // Stream stderr to console and capture it
        child.stderr?.on('data', (data) => {
          const text = data.toString();
          console.error('[COPILOT ERROR]', text);
          errorOutput += text;
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              output: output || 'Command completed successfully',
            });
          } else {
            resolve({
              success: false,
              output: output + errorOutput,
              error: `Command exited with code ${code}`,
            });
          }
        });

        child.on('error', (error) => {
          resolve({
            success: false,
            output: '',
            error: error.message,
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Ask Copilot to create a pull request
   * 
   * Example: "Add multiplication function with tests and documentation"
   */
  async createPullRequest(
    prompt: string,
    options: {
      repository?: string; // e.g., "owner/repo"
      workingDirectory?: string;
      allowAllTools?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    let fullPrompt = prompt;

    // Add repository context if provided
    if (options.repository) {
      fullPrompt = `In repository ${options.repository}: ${prompt}. Create a pull request with these changes.`;
    } else {
      fullPrompt = `${prompt}. Create a pull request with these changes.`;
    }

    return this.runPrompt(fullPrompt, {
      allowAllTools: options.allowAllTools ?? true, // Default to allowing tools for PR creation
      workingDirectory: options.workingDirectory,
    });
  }

  /**
   * Ask Copilot to work on a GitHub issue
   * 
   * @param issueUrl - Full URL to the GitHub issue
   * @param workingDirectory - Directory to work in
   */
  async workOnIssue(
    issueUrl: string,
    workingDirectory?: string
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const prompt = `I've been assigned this issue: ${issueUrl}. Start working on this for me in a suitably named branch.`;

    return this.runPrompt(prompt, {
      allowAllTools: true,
      workingDirectory,
    });
  }

  /**
   * Ask Copilot to make changes and create a PR
   * 
   * @param description - What changes to make
   * @param repository - Target repository (e.g., "owner/repo")
   * @param workingDirectory - Local repository directory
   */
  async makeChangesAndCreatePR(
    description: string,
    repository: string,
    workingDirectory?: string
  ): Promise<{
    success: boolean;
    output: string;
    prUrl?: string;
    error?: string;
  }> {
    const prompt = `Clone repository ${repository} to a temporary directory, make the following changes, and create a pull request: ${description}`;

    const result = await this.runPrompt(prompt, {
      allowAllTools: true,
      workingDirectory,
    });

    // Try to extract PR URL from output
    let prUrl: string | undefined;
    if (result.success) {
      const prMatch = result.output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
      if (prMatch) {
        prUrl = prMatch[0];
      }
    }

    return {
      ...result,
      prUrl,
    };
  }

  /**
   * List open pull requests
   * 
   * @param repository - Optional repository filter (e.g., "owner/repo")
   */
  async listOpenPRs(repository?: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const prompt = repository
      ? `List all open pull requests in ${repository}`
      : "List my open PRs";

    return this.runPrompt(prompt, {
      allowTools: ["shell(gh)"], // Only allow GitHub CLI commands
    });
  }

  /**
   * Create a GitHub issue
   * 
   * @param repository - Repository (e.g., "owner/repo")
   * @param title - Issue title
   * @param body - Issue body
   */
  async createIssue(
    repository: string,
    title: string,
    body: string
  ): Promise<{
    success: boolean;
    output: string;
    issueUrl?: string;
    error?: string;
  }> {
    const prompt = `Raise an issue in ${repository}. Title: "${title}". Body: ${body}`;

    const result = await this.runPrompt(prompt, {
      allowTools: ["shell(gh)"],
    });

    // Try to extract issue URL from output
    let issueUrl: string | undefined;
    if (result.success) {
      const issueMatch = result.output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/);
      if (issueMatch) {
        issueUrl = issueMatch[0];
      }
    }

    return {
      ...result,
      issueUrl,
    };
  }
}
