import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.CHAT_API_BASE_URL ??
  process.env.SERVER_BASE_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  // Proxy streaming response from server as-is
  const payload = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "CHAT_STREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


