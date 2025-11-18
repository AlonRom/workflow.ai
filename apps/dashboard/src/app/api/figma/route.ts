import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, nodeIds } = body;

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                { error: "Figma URL is required" },
                { status: 400 }
            );
        }

        const serverUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${serverUrl}/api/figma/file`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, nodeIds }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.error || "Failed to fetch Figma file" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching Figma file:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
