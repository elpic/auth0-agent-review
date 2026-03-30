import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Auth0 middleware.
 *
 * Protects /dashboard and /audit — unauthenticated users are redirected to the
 * Auth0 login page. All other routes are passed through unchanged.
 *
 * The Auth0 SDK also automatically handles:
 *   - Rolling session refresh
 *   - Access token rotation via refresh tokens
 */
export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  const { pathname } = request.nextUrl;
  const protectedPaths = ["/dashboard", "/audit"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    // Check for an active session.
    // In App Router middleware, getSession() reads from cookies on the
    // incoming request; pass the request so it works in middleware context.
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
