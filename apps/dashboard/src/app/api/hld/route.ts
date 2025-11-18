import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workItemType, title, description, acceptance, createInConfluence, spaceKey } = body;

    // Use different endpoint based on whether we want to create in Confluence
    const endpoint = createInConfluence ? "/api/hld/confluence" : "/api/hld";
    const payload = createInConfluence
      ? { workItemType, title, description, acceptance, spaceKey }
      : { workItemType, title, description, acceptance };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to generate HLD" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("HLD generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate HLD" },
      { status: 500 },
    );
  }
}

