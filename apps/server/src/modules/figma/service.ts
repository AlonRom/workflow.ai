import { getFigmaFile, getFigmaSvgs } from "../../providers/figma.js";
import type { FigmaFileRequest, FigmaSvgRequest } from "./schema.js";

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

    return result;
}
