import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/f/",
  "/subscribe",
  "/unsubscribe",
  "/preferences",
  "/confirm",
  "/archive",
];

/** Matches only the prefix itself or a path segment under it, never "/loginfoo". */
function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`),
  );
}

/**
 * Middleware is a convenience layer, not the security boundary: it redirects
 * signed-out visitors to /login and refreshes the Supabase session cookie.
 *
 * The authoritative gate is requireAdmin() in the (admin) layout, which runs in
 * the Node runtime and checks both the allowlist and the database's RLS. This
 * file therefore fails OPEN — an auth-infrastructure problem here must not take
 * the whole site down, and cannot grant access on its own.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The embeddable form is the one route allowed inside a third-party iframe.
  if (pathname.startsWith("/f/")) {
    const res = NextResponse.next();
    res.headers.delete("X-Frame-Options");
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
    return res;
  }

  // Public routes need no session, so the auth client is never constructed
  // for them. Keeps subscriber-facing pages working regardless of auth state.
  if (isPublic(pathname)) return NextResponse.next();

  try {
    let response = NextResponse.next({ request });

    // Imported lazily so a module-load failure in the edge runtime is caught
    // here rather than crashing every request to the site.
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            toSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Refreshes the session cookie as a side effect; must run before any
    // redirect so the refreshed token is not discarded.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!user || !allowlist.includes((user.email ?? "").toLowerCase())) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search =
        pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    // Let the request through to the page, where requireAdmin() enforces
    // access properly. Logged so the cause is visible in function logs.
    console.error("middleware: auth check failed, deferring to page guard", error);
    return NextResponse.next();
  }
}

export const config = {
  // API routes authenticate themselves (admin session, signed token, webhook
  // signature, or cron secret), so they are deliberately excluded.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
