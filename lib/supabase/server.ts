import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createMockSupabaseClient, isMockMode } from "@/lib/mock/supabase";

// Server-side Supabase client bound to the request's cookies.
// Use in Server Components, route handlers, server actions.
// Typed as `any` schema — we cast results in callers using lib/types/database row types.
export async function createSupabaseServerClient() {
  if (isMockMode()) {
    // Cast through unknown so the mock satisfies the same call sites.
    return createMockSupabaseClient() as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    },
  );
}
