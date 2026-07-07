import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client — SOLO servidor. Ignora RLS; nunca exponer la key. */
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
