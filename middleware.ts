import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Redirect root to login (will be handled by client-side auth check)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For /admin routes, allow Next.js to continue
  // Auth protection will be handled client-side in the admin layout
  // This is intentional for V1 with in-memory auth
  // TODO: Add server-side auth check when refresh tokens with HTTP-only cookies are implemented
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
