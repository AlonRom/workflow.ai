import type { FastifyInstance } from "fastify";
import { hldRequestSchema } from "./schema";
import { HldService } from "./service";
import { ConfluenceService } from "../confluence/service";
import { loadConfig } from "../../config";

const config = loadConfig();
const hldService = new HldService();
const confluenceService = new ConfluenceService(config);

export async function registerHldRoutes(app: FastifyInstance) {
  // Generate HLD content only
  app.post("/api/hld", async (request, reply) => {
    const parsed = hldRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    try {
      const hldContent = await hldService.generateHld(parsed.data);
      return reply.send({ content: hldContent });
    } catch (error) {
      return reply.status(500).send({
        error: "Failed to generate HLD",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Generate HLD and create Confluence page
  app.post("/api/hld/confluence", async (request, reply) => {
    const body = await request.body as { workItemType: string; title: string; description: string; acceptance: string[]; spaceKey?: string };
    const parsed = hldRequestSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    try {
      // Generate HLD content
      const hldContent = await hldService.generateHld(parsed.data);
      
      // Create Confluence page
      const pageTitle = `HLD: ${parsed.data.title}`;
      const page = await confluenceService.createPage(
        pageTitle,
        hldContent,
        body.spaceKey,
      );

      return reply.send({
        content: hldContent,
        pageId: page.id,
        pageUrl: page.url,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: "Failed to create Confluence page",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

