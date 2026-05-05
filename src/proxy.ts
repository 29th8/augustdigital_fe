import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/cookie";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const ADMIN_PREFIXES = ["/admin"];
const AUTH_PREFIXES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated access to protected route → login
  if (isProtected && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated but wrong role for /admin → home
  if (isAdminRoute && token && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Already authenticated → skip auth pages
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
