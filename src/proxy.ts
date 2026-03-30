import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Auth0 proxy handler (Next.js 16+).
 *
 * In Next.js 16 the recommended boundary file is `proxy.ts` (replaces
 * `middleware.ts` for the Node runtime). `middleware.ts` is kept for Edge-
 * runtime backward compatibility — both files share the same logic here.
 *
 * Handles:
 *   - Auth0 SDK routes: /auth/login, /auth/logout, /auth/callback
 *   - Rolling session refresh on every request
 *   - Redirects unauthenticated users away from /dashboard and /audit
 */
export async function proxy(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  const { pathname } = request.nextUrl;
  const protectedPaths = ["/dashboard", "/audit"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const session = await auth0.getSession(request);

    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return authRes;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - public files (*.svg, *.png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
