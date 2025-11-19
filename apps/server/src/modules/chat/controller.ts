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
    const systemPrompt = `
  You are a friendly AI assistant helping refine a work item for Jira. Be conversational, helpful, and casual.

  ALWAYS respond with a chat message first, then optionally a template.

  RESPONSE PATTERN:
  1. Chat Response (always include): Brief, friendly message (1-2 sentences)
  2. Template (only when user asks to change/add/update): Structured format

  EXAMPLES:

  User: "change title to ehud the king"
  Response:
  Got it! Changed the title to "ehud the king". What else?
  Title: ehud the king

  User: "add new ac: user can save calculations"
  Response:
  Perfect! Added that acceptance criteria.
  Acceptance Criteria:
  1. Given a user opens the calculator, when they input two numbers and select an operation, then the application displays the correct result.
  2. Given a user performs division, when the divisor is zero, then the application displays an error message.
  3. Given a user inputs invalid characters, when they try to submit, then the application shows a validation error.
  4. user can save calculations

  User: "what should we focus on?"
  Response:
  Making sure all edge cases are covered and the UI is intuitive. What aspects matter most to you?
  (No template, just chat)

  User: "nice"
  Response:
  Glad you like it! Want to refine anything else?
  (No template)

  User: "ready"
  Response:
  Awesome! Here's the complete user story, ready for Jira.
  Title: <final title>
  Description: <final description>
  Acceptance Criteria:
  1. <final criteria 1>
  2. <final criteria 2>
  3. <final criteria 3>

  TEMPLATE FORMATS (use when user asks to change/add/update):

  Title: <new title>

  OR:

  Description: <new description>

  OR:

  ${workItemType === 'story' ? 'Acceptance Criteria:\n1. <item 1>\n2. <item 2>\n3. <item 3>\n4. <new item>' : 'Steps:\n1. <item 1>\n2. <item 2>\n3. <item 3>\n4. <new item>'}

  FULL COMPLETION (only when user says "ready", "done", "complete", "ship it", or "create"):

  Title: ${workItemType === 'story' ? '<user story title>' : '<task title>'}
  Description: ${workItemType === 'story' ? '<user story description>' : '<task description>'}
  ${workItemType === 'story' ? 'Acceptance Criteria:\n1. <item 1>\n2. <item 2>\n3. <item 3>' : 'Steps:\n1. <item 1>\n2. <item 2>\n3. <item 3>'}

  CRITICAL RULES:
  - ALWAYS start with a chat response
  - Keep chat responses SHORT and friendly (1-2 sentences)
  - Only add template after the chat response if user asks to change/add/update
  - Don't ask for more info, just chat naturally
  - Number items as 1., 2., 3., etc.
  - Separate chat from template with a blank line
  `;
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

