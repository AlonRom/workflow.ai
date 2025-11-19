import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const copilotPayload = {
      owner: "workflowai-hackaton",
      repo: "hackaton-demo-calculator",
      description: payload.description,
      allowAllTools: true,
    };

    const copilotRes = await fetch(`${API_BASE_URL}/api/copilot-cli/create-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(copilotPayload),
      cache: "no-store",
    });

    if (!copilotRes.ok) {
      const errorText = await copilotRes.text();
      throw new Error(`Copilot CLI failed: ${errorText}`);
    }

    const copilotBody = await copilotRes.json();
    return NextResponse.json(copilotBody);
  } catch (error) {
    console.error("Copilot API proxy error", error);
    return NextResponse.json(
      {
        error: "COPILOT_UNAVAILABLE",
        message: "Copilot CLI is unavailable. Try again shortly.",
      },
      { status: 502 },
    );
  }
}
