import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { FigmaFileRequestSchema, FigmaSvgRequestSchema } from "./schema.js";
import { fetchFigmaFile, fetchFigmaSvgs } from "./service.js";

export async function getFigmaFileHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const body = FigmaFileRequestSchema.parse(request.body);
        const result = await fetchFigmaFile(body);
        return reply.status(200).send(result);
    } catch (error) {
        if (error instanceof Error) {
            return reply.status(400).send({
                error: error.message,
            });
        }
        return reply.status(500).send({
            error: "An unexpected error occurred",
        });
    }
}

export async function getFigmaSvgsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const body = FigmaSvgRequestSchema.parse(request.body);
        const result = await fetchFigmaSvgs(body);
        return reply.status(200).send(result);
    } catch (error) {
        if (error instanceof Error) {
            return reply.status(400).send({
                error: error.message,
            });
        }
        return reply.status(500).send({
            error: "An unexpected error occurred",
        });
    }
}

export async function getSvgHandler(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { getSvgById } = await import("./service.js");
        const svgContent = getSvgById(id);

        if (!svgContent) {
            return reply.status(404).send({ error: "SVG not found or expired" });
        }

        return reply
            .header("Content-Type", "image/svg+xml")
            .header("Cache-Control", "public, max-age=3600")
            .send(svgContent);
    } catch (error) {
        return reply.status(500).send({
            error: "An unexpected error occurred",
        });
    }
}

export async function registerFigmaRoutes(app: FastifyInstance) {
    app.post("/api/figma/file", getFigmaFileHandler);
    app.post("/api/figma/svgs", getFigmaSvgsHandler);
    app.get("/api/figma/svg/:id", getSvgHandler);
}
