import { getFigmaFile, getFigmaSvgs } from "../../providers/figma.js";
import type { FigmaFileRequest, FigmaSvgRequest } from "./schema.js";
import { randomBytes } from "crypto";

// Simple in-memory storage for SVG content (expires after 1 hour)
const svgStorage = new Map<string, { content: string; timestamp: number }>();

// Clean up expired SVGs every 10 minutes
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    for (const [id, data] of svgStorage.entries()) {
        if (now - data.timestamp > oneHour) {
            svgStorage.delete(id);
        }
    }
}, 10 * 60 * 1000);

function storeSvg(content: string): string {
    const id = randomBytes(16).toString("hex");
    svgStorage.set(id, { content, timestamp: Date.now() });
    return id;
}

export function getSvgById(id: string): string | null {
    const data = svgStorage.get(id);
    return data ? data.content : null;
}

export async function fetchFigmaFile(request: FigmaFileRequest) {
    const result = await getFigmaFile({
        url: request.url,
        nodeIds: request.nodeIds,
    });

    if (!result) {
        throw new Error("Failed to fetch Figma file. Please check the URL and ensure you have access to the file.");
    }

    return result;
}

export async function fetchFigmaSvgs(request: FigmaSvgRequest) {
    const result = await getFigmaSvgs({
        url: request.url,
        nodeIds: request.nodeIds,
    });

    if (!result) {
        throw new Error("Failed to fetch Figma SVGs. Please check the URL and node IDs.");
    }

    // Store each SVG in memory and return URLs to server endpoint
    const baseUrl = process.env.SERVER_BASE_URL || "http://localhost:4000";
    const svgUrls: Record<string, string> = {};

    for (const [nodeId, svgContent] of Object.entries(result)) {
        if (svgContent) {
            const id = storeSvg(svgContent);
            svgUrls[nodeId] = `${baseUrl}/api/figma/svg/${id}`;
        }
    }

    return svgUrls;
}