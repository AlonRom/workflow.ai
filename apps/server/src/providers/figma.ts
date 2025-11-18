export type FigmaFileOptions = {
    url: string;
    nodeIds?: string[];
};

export type FigmaFileResponse = {
    name: string;
    lastModified: string;
    document: any;
    components?: Record<string, any>;
    styles?: Record<string, any>;
    schemaVersion?: number;
};

function extractFileKeyFromUrl(url: string): string | null {
    try {
        // Support both figma.com/file/:key and figma.com/design/:key formats
        const regex = /figma\.com\/(file|design)\/([a-zA-Z0-9]+)/;
        const match = regex.exec(url);
        return match ? match[2] : null;
    } catch (error) {
        console.error("Error parsing Figma URL:", error);
        return null;
    }
}

export async function getFigmaFile({
    url,
    nodeIds,
}: FigmaFileOptions): Promise<FigmaFileResponse | null> {
    const apiKey = process.env.FIGMA_API_KEY;
    if (!apiKey) {
        console.error("FIGMA_API_KEY not found in environment");
        return null;
    }

    // Extract file key from URL
    const fileKey = extractFileKeyFromUrl(url);
    if (!fileKey) {
        console.error("Invalid Figma file URL. Expected format: https://figma.com/file/:fileKey or https://figma.com/design/:fileKey");
        return null;
    }

    // Build URL based on whether we want specific nodes or entire file
    const apiUrl = nodeIds && nodeIds.length > 0
        ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`
        : `https://api.figma.com/v1/files/${fileKey}`;

    try {
        const res = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "X-Figma-Token": apiKey,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Figma API error (${res.status}):`, errorText);
            return null;
        }

        return (await res.json()) as FigmaFileResponse;
    } catch (error) {
        console.error("Error fetching Figma file:", error);
        return null;
    }
}

export type FigmaImageOptions = {
    fileKey: string;
    nodeIds: string[];
    scale?: number;
    format?: "jpg" | "png" | "svg" | "pdf";
};

export async function getFigmaImages({
    fileKey,
    nodeIds,
    scale = 1,
    format = "png",
}: FigmaImageOptions): Promise<Record<string, string> | null> {
    const apiKey = process.env.FIGMA_API_KEY;
    if (!apiKey) {
        console.error("FIGMA_API_KEY not found in environment");
        return null;
    }

    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds.join(',')}&scale=${scale}&format=${format}`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "X-Figma-Token": apiKey,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Figma API error (${res.status}):`, errorText);
            return null;
        }

        const data = (await res.json()) as { images: Record<string, string> };
        return data.images;
    } catch (error) {
        console.error("Error fetching Figma images:", error);
        return null;
    }
}

export type FigmaSvgOptions = {
    url: string;
    nodeIds: string[];
};

export async function getFigmaSvgs({
    url,
    nodeIds,
}: FigmaSvgOptions): Promise<Record<string, string> | null> {
    const apiKey = process.env.FIGMA_API_KEY;
    if (!apiKey) {
        console.error("FIGMA_API_KEY not found in environment");
        return null;
    }

    // Extract file key from URL
    const fileKey = extractFileKeyFromUrl(url);
    if (!fileKey) {
        console.error("Invalid Figma file URL");
        return null;
    }

    // Get SVG URLs from Figma API
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds.join(',')}&format=svg&svg_include_id=true`;

    try {
        const res = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "X-Figma-Token": apiKey,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Figma API error (${res.status}):`, errorText);
            return null;
        }

        const data = (await res.json()) as { images: Record<string, string> };

        // Fetch actual SVG content from each URL
        const svgContents: Record<string, string> = {};

        for (const [nodeId, svgUrl] of Object.entries(data.images)) {
            try {
                const svgRes = await fetch(svgUrl);
                if (svgRes.ok) {
                    svgContents[nodeId] = await svgRes.text();
                } else {
                    console.error(`Failed to fetch SVG for node ${nodeId}`);
                    svgContents[nodeId] = "";
                }
            } catch (error) {
                console.error(`Error fetching SVG content for node ${nodeId}:`, error);
                svgContents[nodeId] = "";
            }
        }

        return svgContents;
    } catch (error) {
        console.error("Error fetching Figma SVGs:", error);
        return null;
    }
}

export type FigmaCommentsResponse = {
    comments: Array<{
        id: string;
        message: string;
        file_key: string;
        parent_id?: string;
        user: {
            handle: string;
            img_url: string;
        };
        created_at: string;
        resolved_at?: string;
        client_meta?: any;
    }>;
};

export async function getFigmaComments(
    fileKey: string
): Promise<FigmaCommentsResponse | null> {
    const apiKey = process.env.FIGMA_API_KEY;
    if (!apiKey) {
        console.error("FIGMA_API_KEY not found in environment");
        return null;
    }

    const url = `https://api.figma.com/v1/files/${fileKey}/comments`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "X-Figma-Token": apiKey,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Figma API error (${res.status}):`, errorText);
            return null;
        }

        return (await res.json()) as FigmaCommentsResponse;
    } catch (error) {
        console.error("Error fetching Figma comments:", error);
        return null;
    }
}
