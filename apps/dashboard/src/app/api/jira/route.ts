import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    // Step 1: Create Jira issue as before
    const res = await fetch(`${API_BASE_URL}/api/jira/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstream Jira API failed: ${res.status}`);
    }

    const jiraBody = await res.json();



    return NextResponse.json(jiraBody);
  } catch (error) {
    console.error("Jira API proxy error", error);
    return NextResponse.json(
      {
        error: "JIRA_BACKEND_UNAVAILABLE",
        message: "Jira backend is unavailable. Try again shortly.",
      },
      { status: 502 },
    );
  }
}

