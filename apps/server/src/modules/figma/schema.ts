import { z } from "zod";

export const FigmaFileRequestSchema = z.object({
    url: z.string().url(),
    nodeIds: z.array(z.string()).optional(),
});

export type FigmaFileRequest = z.infer<typeof FigmaFileRequestSchema>;

export const FigmaSvgRequestSchema = z.object({
    url: z.string().url(),
    nodeIds: z.array(z.string()),
});

export type FigmaSvgRequest = z.infer<typeof FigmaSvgRequestSchema>;
