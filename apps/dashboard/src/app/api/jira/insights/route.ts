import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const res = await fetch(`${API_BASE_URL}/api/jira/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const body = isJson ? await res.json() : await res.text();

      return NextResponse.json(
        {
          error: "JIRA_INSIGHTS_UNAVAILABLE",
          message:
            typeof body === "string"
              ? body
              : body?.message ?? "Mock Jira insights backend unavailable.",
        },
        { status: res.status },
      );
    }

    const body = await res.json();
    return NextResponse.json(body);
  } catch (error) {
    console.error("Mock Jira insights proxy error", error);
    return NextResponse.json(
      {
        error: "JIRA_INSIGHTS_PROXY_ERROR",
        message: "Unable to reach the mock Jira insights backend.",
      },
      { status: 502 },
    );
  }
}


