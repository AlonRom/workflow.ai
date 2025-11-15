import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstream chat API failed: ${res.status}`);
    }

    const assistantMessage = await res.json();
    return NextResponse.json(assistantMessage);
  } catch (error) {
    console.error("Chat API proxy error", error);
    return NextResponse.json(
      {
        error: "CHAT_BACKEND_UNAVAILABLE",
        message: "Chat backend is unavailable. Try again shortly.",
      },
      { status: 502 },
    );
  }
}

