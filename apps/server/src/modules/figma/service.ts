import { getFigmaFile, getFigmaSvgs } from "../../providers/figma.js";
import type { FigmaFileRequest, FigmaSvgRequest } from "./schema.js";
import { Octokit } from "@octokit/rest";

async function uploadSvgToGist(svgContent: string, fileName: string): Promise<string> {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error("GITHUB_TOKEN not configured");
    }

    const octokit = new Octokit({ auth: githubToken });

    const gist = await octokit.gists.create({
        description: `Figma SVG export: ${fileName}`,
        public: false,
        files: {
            [`${fileName}.svg`]: {
                content: svgContent,
            },
        },
    });

    if (!gist.data.files) {
        throw new Error("Failed to create gist");
    }

    const gistFile = gist.data.files[`${fileName}.svg`];
    if (!gistFile || !gistFile.raw_url) {
        throw new Error("Failed to get gist URL");
    }

    return gistFile.raw_url;
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

    // Upload each SVG to a Gist and return URLs instead of content
    const svgUrls: Record<string, string> = {};

    for (const [nodeId, svgContent] of Object.entries(result)) {
        if (svgContent) {
            try {
                const url = await uploadSvgToGist(svgContent, `node-${nodeId}`);
                svgUrls[nodeId] = url;
            } catch (error) {
                console.error(`Failed to upload SVG for node ${nodeId}:`, error);
                svgUrls[nodeId] = "";
            }
        }
    }

    return svgUrls;
}
