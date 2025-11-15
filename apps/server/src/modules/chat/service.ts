import type { ChatRequest } from "./schema";

const cannedResponses = [
  "Let's pin down success metrics before we push to Jira.",
  "I’d add a rollout guardrail. Want me to suggest one?",
  "Sounds good. Need any help writing acceptance tests?",
  "Consider dependencies with analytics or billing here.",
  "Happy to summarize this into a Jira-ready payload.",
];

export class ChatService {
  async generateReply(payload: ChatRequest) {
    const response =
      cannedResponses[Math.floor(Math.random() * cannedResponses.length)];

    return {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: `[${payload.workItemType.toUpperCase()}] ${response}`,
      timestamp: new Date().toISOString(),
    };
  }
}

