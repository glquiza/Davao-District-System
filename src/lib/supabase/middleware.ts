import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");
  const isResetPasswordPage = pathname.startsWith("/reset-password");
  const isPublicRoot = pathname === "/";

  // Fast-path: do not make an extra auth roundtrip on POST Server Actions (e.g., submitting login/signup forms) or public root
  if (request.method === "POST" || isPublicRoot) {
    return NextResponse.next({ request });
  }

  // Fast-path: if no Supabase auth cookie exists at all, avoid a remote getUser() network call
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  if (!hasAuthCookie) {
    if (!isAuthPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      if (isResetPasswordPage) {
        redirectUrl.searchParams.set(
          "error",
          "Your password reset link is invalid or has expired. Please request a new one."
        );
      }
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user && !isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (isResetPasswordPage) {
      redirectUrl.searchParams.set(
        "error",
        "Your password reset link is invalid or has expired. Please request a new one."
      );
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and on an auth page, redirect to feed EXCEPT when they are on reset-password
  if (user && isAuthPage && !isResetPasswordPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/feed";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
