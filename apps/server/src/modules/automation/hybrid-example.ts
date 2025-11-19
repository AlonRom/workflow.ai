import type { FastifyInstance } from "fastify";

/**
 * Example: Hybrid Automation Strategy
 * 
 * This demonstrates using BOTH repository_dispatch and Copilot coding agent
 * together for maximum efficiency:
 * 
 * 1. repository_dispatch: Fast template-based scaffolding
 * 2. Copilot coding agent: AI-powered implementation
 */
export async function registerHybridExampleRoutes(app: FastifyInstance) {
  /**
   * POST /api/automation/hybrid-feature
   * 
   * Example: Create a complete feature using both automation approaches
   * 
   * Step 1: Use repository_dispatch to scaffold structure (fast, deterministic)
   * Step 2: Use Copilot to implement logic (intelligent, thorough)
   */
  app.post("/api/automation/hybrid-feature", async (request, reply) => {
    const { featureName, description } = request.body as {
      featureName: string;
      description: string;
    };

    try {
      // Step 1: Scaffold with repository_dispatch (your custom workflow)
      const scaffoldResponse = await fetch("http://localhost:4000/api/github/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "workflowai-hackaton",
          repo: "hackaton-demo-calculator",
          taskId: `scaffold-${Date.now()}`,
          title: `Scaffold ${featureName}`,
          summary: `Create folder structure and boilerplate for ${featureName}`,
          acceptanceCriteria: `
            - Create feature folder: src/features/${featureName.toLowerCase()}
            - Add index.ts with exports
            - Add types.ts with TypeScript interfaces
            - Add ${featureName}.test.ts with test placeholders
            - Update main index.ts to export new feature
          `,
          base: "main",
        }),
      });

      if (!scaffoldResponse.ok) {
        throw new Error("Scaffolding failed");
      }

      // Wait a bit for scaffolding to complete (optional)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 2: Let Copilot implement the logic
      const copilotResponse = await fetch("http://localhost:4000/api/copilot/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "workflowai-hackaton",
          repo: "hackaton-demo-calculator",
          title: `Implement ${featureName}`,
          body: `${description}\n\n**Context:**\nThe scaffolding has been created by another workflow. Please implement the actual logic.`,
          labels: ["enhancement", "ai-generated", "hybrid-automation"],
          additionalInstructions: `
            Work within the scaffolded structure in src/features/${featureName.toLowerCase()}.
            Follow our existing patterns and code style.
            Ensure comprehensive test coverage.
            Add JSDoc documentation.
          `,
        }),
      });

      if (!copilotResponse.ok) {
        throw new Error("Copilot assignment failed");
      }

      const copilotData = (await copilotResponse.json()) as {
        issue?: { url: string };
      };

      return reply.send({
        success: true,
        message: "Hybrid automation started successfully",
        steps: {
          scaffolding: {
            status: "completed",
            method: "repository_dispatch",
            note: "Template-based structure created",
          },
          implementation: {
            status: "in_progress",
            method: "copilot_coding_agent",
            issueUrl: copilotData.issue?.url,
            note: "Copilot will implement the logic and create a PR",
          },
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: "HYBRID_AUTOMATION_FAILED",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/automation/smart-routing
   * 
   * Example: Automatically choose the right automation approach based on complexity
   */
  app.post("/api/automation/smart-routing", async (request, reply) => {
    const { task } = request.body as { task: string };

    // Simple heuristic: use Copilot for complex tasks, repository_dispatch for simple ones
    const isComplex = 
      task.length > 200 || // Long description = complex
      /implement|build|create.*with/i.test(task) || // Implementation keywords
      /oauth|authentication|database|api/i.test(task); // Complex domains

    const endpoint = isComplex 
      ? "/api/copilot/tasks"
      : "/api/github/tasks";

    const method = isComplex ? "Copilot AI" : "Template Workflow";

    try {
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isComplex
            ? {
                title: task,
                body: task,
                labels: ["auto-routed", "ai-generated"],
              }
            : {
                taskId: `task-${Date.now()}`,
                title: task,
                summary: task,
                base: "main",
              }
        ),
      });

      const data = await response.json();

      return reply.send({
        success: true,
        selectedMethod: method,
        reason: isComplex ? "Task complexity requires AI reasoning" : "Task is straightforward, using template",
        result: data,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: "ROUTING_FAILED",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Example Usage:
 * 
 * 1. Hybrid approach (both methods):
 * 
 * curl -X POST http://localhost:4000/api/automation/hybrid-feature \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "featureName": "UserProfile",
 *     "description": "User profile management with avatar upload, bio, and preferences"
 *   }'
 * 
 * 2. Smart routing (automatic selection):
 * 
 * curl -X POST http://localhost:4000/api/automation/smart-routing \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "task": "Implement OAuth2 authentication with Google and GitHub providers, including session management and security best practices"
 *   }'
 * 
 * The smart router will automatically choose Copilot for this complex task.
 * 
 * curl -X POST http://localhost:4000/api/automation/smart-routing \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "task": "Add a console.log to index.ts"
 *   }'
 * 
 * The smart router will use repository_dispatch for this simple task.
 */
