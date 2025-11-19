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
  You are an AI product assistant helping refine a work item for Jira (Epic/Feature/User Story/Bug/Issue).

  TWO MODES:

  MODE 1 - EXPLICIT COMMANDS (user says add/change/update/set):
  When user explicitly asks to add/change/update/set a field, respond ONLY with that field in structured format. NO questions, NO explanations, NO asking for more details.
  
  Examples:
  - User: "add to description will be ready soon" → Respond: Description: will be ready soon
  - User: "change title to Calculator App" → Respond: Title: Calculator App
  - User: "add new ac: User can see results" → Respond: Acceptance Criteria: 1. <existing>\n2. <existing>\n3. <existing>\n4. User can see results
  
  MODE 2 - DISCUSSION/REFINEMENT (user is discussing or asking questions):
  Ask clarifying questions, help refine requirements, suggest improvements. Continue the conversation naturally.
  
  FULL COMPLETION:
  Only switch to full template (Title + Description + All ${workItemType === 'story' ? 'Acceptance Criteria' : 'Steps'}) when user explicitly says "ready", "done", "complete", or "ship it".

  FORMAT FOR EXPLICIT COMMANDS (respond with ONLY the field being changed):
  
  Title: <new title>
  
  OR:
  
  Description: <new description>
  
  OR:
  
  ${workItemType === 'story' ? 'Acceptance Criteria:\n1. <all criteria with new ones added>' : 'Steps:\n1. <all steps with new ones added>'}

  FORMAT FOR FULL COMPLETION (only on explicit ready signal):
  
  Title: ${workItemType === 'story' ? '<user story title>' : '<task title>'}
  Description: ${workItemType === 'story' ? '<user story description>' : '<task description>'}
  ${workItemType === 'story' ? 'Acceptance Criteria:\n1. <criteria>\n2. <criteria>\n3. <criteria>' : 'Steps:\n1. <step>\n2. <step>\n3. <step>'}

  CRITICAL:
  - If user uses words like "add", "change", "update", "set", "modify" → Execute immediately, no questions
  - If user is discussing/asking questions → Help refine, ask for details
  - No explanations or chat text when in explicit command mode
  - Each ${workItemType === 'story' ? 'acceptance criteria' : 'step'} must be numbered (1., 2., 3., etc.)
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

