type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

export type StreamOptions = {
  model?: string;
  messages: OpenAIMessage[];
};

export async function streamOpenAIChat({
  model,
  messages,
}: StreamOptions): Promise<Response | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const resolvedModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Use Chat Completions streaming for broad compatibility
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      stream: true,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    // Surface error to caller by returning null, caller can fallback
    return null;
  }
  return res;
}


