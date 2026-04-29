import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth-config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const path = req.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/demo/checkin");

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", `${path}${req.nextUrl.search}`);
    return Response.redirect(url);
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
