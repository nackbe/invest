import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client — SOLO servidor. Ignora RLS; nunca exponer la key. */
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      // Next.js parcha fetch y cachea los GET por defecto; el estado del juego es
      // en vivo, así que nunca cacheamos las lecturas a Supabase.
      global: { fetch: (input, init) => fetch(input as RequestInfo, { ...init, cache: "no-store" }) },
    }
  );
}
