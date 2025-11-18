import type { HldRequest } from "./schema";
import { streamOpenAIChat } from "../../providers/openai";

export class HldService {
  async generateHld(payload: HldRequest): Promise<string> {
    const systemPrompt = `You are a technical architect helping create a High-Level Design (HLD) document for Confluence. 
Generate a comprehensive, well-structured HLD document in Confluence wiki markup format.

Guidelines:
- Use Confluence macros (panel, info, expand, code blocks)
- Structure should include: Overview, Architecture, Components, Data Flow, APIs, Dependencies, Risks
- Be technical but clear
- Use proper Confluence formatting (h1, h2, h3, code blocks, panels)
- Include diagrams descriptions where appropriate
- Make it actionable and detailed enough for developers to implement`;

    const userPrompt = `Generate a High-Level Design document in Confluence format for:

**Work Item Type**: ${payload.workItemType}
**Title**: ${payload.title}
**Description**: ${payload.description}
**Acceptance Criteria**:
${payload.acceptance.map((ac, i) => `${i + 1}. ${ac}`).join("\n")}

Create a comprehensive HLD document that covers:
1. Overview and Objectives
2. System Architecture
3. Key Components
4. Data Models/Flow
5. APIs and Interfaces
6. Dependencies
7. Security Considerations
8. Risks and Mitigations
9. Implementation Phases

Format the response in Confluence wiki markup.`;

    const response = await streamOpenAIChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
    });

    if (!response || !response.body) {
      throw new Error("Failed to generate HLD");
    }

    // Read the stream and concatenate the content
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    // Handle remaining buffer
    if (buffer) {
      const lines = buffer.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    return fullContent.trim();
  }
}

