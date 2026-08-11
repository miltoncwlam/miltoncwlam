import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseKey } from "@/lib/supabase/env";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseKey(),
  );
}
