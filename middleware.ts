import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;

  // Graceful degradation: when Supabase isn't configured (local UI preview),
  // skip auth checks so the landing/legal pages still render.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  // Set up Supabase client that can refresh session cookies on this response.
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options as CookieOptions),
          );
        },
      },
    },
  );

  // Refresh / load session
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = url.pathname === "/login" || url.pathname === "/signup";
  const isDashboard = url.pathname.startsWith("/dashboard");

  if (!user && isDashboard) {
    const redirect = NextResponse.redirect(new URL(`/login?next=${url.pathname}`, req.url));
    // Preserve any cookie updates made by getUser()
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  if (user && isAuthPage) {
    const redirect = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
