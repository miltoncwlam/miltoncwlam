import "server-only";

import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const booleanFlag = z.preprocess((value) => {
  if (value === undefined || value === "") return false;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: optionalSecret,
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("flashcard-media"),
  LLM_DEFAULT_PROVIDER: z
    .enum(["openai", "anthropic", "google", "ollama"])
    .default("openai"),
  OPENAI_API_KEY: optionalSecret,
  ANTHROPIC_API_KEY: optionalSecret,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-3-5-haiku-latest"),
  GOOGLE_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  OLLAMA_ENABLED: booleanFlag.default(false),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.preprocess((value) => {
    const raw = String(value ?? "gemma4:e4b");
    return raw === "gemma4:e2b" || raw === "gemma4:e4b" ? raw : "gemma4:e4b";
  }, z.enum(["gemma4:e4b", "gemma4:e2b"])),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalSecret,
  CLERK_SECRET_KEY: optionalSecret,
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  BETTER_AUTH_URL: parsed.BETTER_AUTH_URL ?? parsed.NEXT_PUBLIC_APP_URL,
  supabaseBrowserKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
};
