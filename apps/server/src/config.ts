import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFilePath =
  process.env.SERVER_ENV_PATH ?? path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envFilePath });

const envSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_PROJECT_KEY: z.string().min(1),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  CONFLUENCE_BASE_URL: z.string().url().optional(),
  CONFLUENCE_SPACE_KEY: z.string().min(1).optional(),
  CONFLUENCE_EMAIL: z.string().email().optional(),
  CONFLUENCE_API_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid Jira configuration: ${JSON.stringify(
        parsed.error.flatten().fieldErrors,
      )}`,
    );
  }
  return parsed.data;
}

