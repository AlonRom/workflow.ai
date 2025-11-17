import type { FastifyInstance } from "fastify";
import { chatRequestSchema } from "./schema";
import { ChatService } from "./service";
import { streamOpenAIChat } from "../../providers/openai";

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

  // Simple SSE endpoint for MVP (no persistence). Expects full messages in body.
  app.post("/api/chat/stream", async (request, reply) => {
    // Prepare SSE headers
    reply
      .header("Content-Type", "text/event-stream; charset=utf-8")
      .header("Cache-Control", "no-cache, no-transform")
      .header("Connection", "keep-alive")
      .raw.flushHeaders?.();

    // Strictly validate payload; a valid workItemType must be provided
    const body = await request.body;
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      reply.raw.write(
        `data: ${JSON.stringify({
          type: "error",
          message: "Invalid chat payload",
        })}\n\n`,
      );
      reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      reply.raw.end();
      return;
    }
    const { workItemType, messages } = parsed.data;

    // Try real OpenAI streaming first
    const systemPrompt =
      "You are an AI product assistant helping refine a work item for Jira (Epic/Feature/User Story/Bug/Issue). Ask clarifying questions, write acceptance criteria, and keep replies concise.";
    const openAiRes =
      (await streamOpenAIChat({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      })) || null;

    if (openAiRes && openAiRes.body) {
      const reader = openAiRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamClosed = false;
      const safeWrite = (chunk: string) => {
        if (!streamClosed) {
          reply.raw.write(chunk);
        }
      };
      const endStream = () => {
        if (!streamClosed) {
          streamClosed = true;
          reply.raw.end();
        }
      };
      const pump = async () => {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") {
                safeWrite(
                  `data: ${JSON.stringify({ type: "done" })}\n\n`,
                );
                endStream();
                return;
              }
              try {
                const json = JSON.parse(data) as {
                  choices?: Array<{
                    delta?: { content?: string };
                  }>;
                };
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  safeWrite(
                    `data: ${JSON.stringify({ type: "delta", delta: content })}\n\n`,
                  );
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } finally {
          safeWrite(`data: ${JSON.stringify({ type: "done" })}\n\n`);
          endStream();
        }
      };
      pump();
      return;
    }

    // Fallback: canned streaming (when no OpenAI key)
    const canned = await chatService.generateReply({ workItemType, messages });
    const text = canned.content;
    const words = text.split(" ");
    let index = 0;
    const interval = setInterval(() => {
      if (index >= words.length) {
        reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        clearInterval(interval);
        setTimeout(() => reply.raw.end(), 50);
        return;
      }
      const delta = (index === 0 ? "" : " ") + words[index++];
      reply.raw.write(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`);
    }, 40);
    request.raw.on("close", () => clearInterval(interval));
  });
}

