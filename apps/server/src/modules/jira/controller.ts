import type { FastifyInstance } from "fastify";
import { jiraIssueRequestSchema } from "./schema";
import { JiraService } from "./service";
import { loadConfig } from "../../config";

const config = loadConfig();
const jiraService = new JiraService(config);

export async function registerJiraRoutes(app: FastifyInstance) {
  app.post("/api/jira/issues", async (request, reply) => {
    const parsed = jiraIssueRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      });
    }

    try {
      const issue = await jiraService.createIssue(parsed.data);
      return reply.send({
        key: issue.key,
        url: `${config.JIRA_BASE_URL}/browse/${issue.key}`,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "JIRA_CREATE_FAILED",
        message: "Unable to create Jira issue.",
      });
    }
  });
}

