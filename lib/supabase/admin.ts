import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export function createAdminClient() {
  if (!env.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for media storage");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
