import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
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
