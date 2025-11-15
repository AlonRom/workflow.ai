import type { FastifyInstance } from "fastify";
import { chatRequestSchema } from "./schema";
import { ChatService } from "./service";

const chatService = new ChatService();

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/api/chat", async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    const assistantMessage = await chatService.generateReply(parsed.data);
    return reply.send(assistantMessage);
  });
}

