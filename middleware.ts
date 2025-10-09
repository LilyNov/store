import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  // Run Auth0 middleware first
  const response = await auth0.middleware(request);

  // Determine if user is authenticated (Auth0 sets session cookie / user in getSession downstream)
  // We keep middleware light: we only set a sessionCartId for anonymous visitors.
  const hasSessionCart = !!request.cookies.get("sessionCartId");

  if (!hasSessionCart) {
    // Heuristic: if user is already authenticated we do NOT create a new anonymous session cart
    // because cart actions will now use userId-based cart.
    // We can't call auth0.getSession() here cheaply (could, but keep minimal). Instead rely on cookie names.
    const cookieNames = request.cookies.getAll().map((c) => c.name);
    const isAuthLikely = cookieNames.some(
      (name) => name.startsWith("appSession") || name.includes("auth0")
    );
    if (!isAuthLikely) {
      const sessionCartId = crypto.randomUUID();
      response.cookies.set("sessionCartId", sessionCartId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

// The Auth0 client is initialized in the lib/auth0.ts file, which is imported here.
// The middleware function is exported and will be used by Next.js to handle requests.
// The config object specifies the matcher patterns for the middleware.
// This setup allows for a clean separation of concerns, keeping the authentication logic modular and reusable across different parts of the application.
// The middleware will automatically handle redirects for unauthenticated users, ensuring they are sent to the login page.
