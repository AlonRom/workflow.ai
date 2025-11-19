import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerChatRoutes } from "./modules/chat/controller.js";
import { registerJiraRoutes } from "./modules/jira/controller.js";
import { registerFigmaRoutes } from "./modules/figma/controller.js";
import { registerHldRoutes } from "./modules/hld/controller.js";
import { registerGithubRoutes } from "./modules/github/controller";
import { registerCopilotRoutes } from "./modules/copilot/controller";
import { registerCopilotCLIRoutes } from "./modules/copilot-cli/controller";

// Load .env file before anything else
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFilePath =
  process.env.SERVER_ENV_PATH ?? path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envFilePath });

async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await registerChatRoutes(app);
  await registerJiraRoutes(app);
  await registerGithubRoutes(app);
  await registerCopilotRoutes(app);
  await registerCopilotCLIRoutes(app);
  await registerFigmaRoutes(app);
  await registerHldRoutes(app);
  app.get("/healthz", async () => ({ ok: true }));
  return app;
}

if (process.env.NODE_ENV !== "test") {
  buildServer()
    .then((app) => {
      const port = Number(process.env.PORT ?? 4000);
      app.listen({ port, host: "0.0.0.0" }, (err, address) => {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }
        app.log.info(`Server listening on ${address}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server", err);
      process.exit(1);
    });
}

export type AppInstance = Awaited<ReturnType<typeof buildServer>>;

