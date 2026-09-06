import "server-only";

import { z } from "zod";

import { publicAppUrl } from "@/lib/app-url";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: optionalSecret,
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("flashcard-media"),
  LLM_DEFAULT_PROVIDER: z.preprocess((value) => {
    const raw = String(value ?? "openrouter");
    if (raw === "openai" || raw === "anthropic" || raw === "google" || raw === "ollama") {
      return "openrouter";
    }
    return raw;
  }, z.literal("openrouter").default("openrouter")),
  OPENROUTER_API_KEY: optionalSecret,
  OPENROUTER_MODEL: z.string().min(1).default("deepseek/deepseek-v4-flash"),
  OPENROUTER_FREE_MODEL_BLOCKLIST: z.string().optional(),
  OLLAMA_BASE_URL: optionalSecret,
  OLLAMA_MODEL: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1),
  ),
  CLERK_SECRET_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1),
  ),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(
    `Missing ${keys}. For Clerk, paste API keys (pk_live_ / sk_live_ for production, or pk_test_ / sk_test_ for development) from dashboard.clerk.com.`,
  );
}

export const env = {
  ...parsed.data,
  NEXT_PUBLIC_APP_URL: publicAppUrl(),
  supabaseBrowserKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: parsed.data.SUPABASE_SECRET_KEY,
};
