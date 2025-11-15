import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerChatRoutes } from "./modules/chat/controller";
import { registerJiraRoutes } from "./modules/jira/controller";

async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await registerChatRoutes(app);
  await registerJiraRoutes(app);
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

