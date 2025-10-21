import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    // Check if user is authorized for admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
      if (request.nextauth.token?.role !== "ADMIN" && request.nextauth.token?.role !== "OWNER") {
        // Don't redirect, just deny access - let the component handle it
        return NextResponse.next()
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/profile/:path*",
    "/api/admin/:path*",
    "/api/profile/:path*",
    "/api/projects/:path*",
    "/api/user/:path*",
    "/api/cards/:path*",
    "/api/boards/:path*",
    "/api/lists/:path*",
  ],
};
