import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";
// import { prisma } from "@/db/prisma";
// import { getAuth0UserMetadata } from "@/lib/auth0-management";

export async function middleware(request: NextRequest) {
  // Run Auth0 middleware first
  const response = await auth0.middleware(request);

  // Check for cart cookie and set if missing
  if (!request.cookies.get("sessionCartId")) {
    const sessionCartId = crypto.randomUUID();
    response.cookies.set("sessionCartId", sessionCartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  // else {
  //   const sessionCartId = request.cookies.get("sessionCartId")?.value;
  //   const sessionCart = await prisma.cart.findFirst({
  //     where: { sessionCartId },
  //   });
  //   // Get session and user ID
  //   let userId: string | null = null;
  //   const session = await auth0.getSession();
  //   const userSessionId = session?.user.sub;

  //   if (userSessionId) {
  //     const userMetadata = await getAuth0UserMetadata(userSessionId);
  //     // Extract the userId from userMetadata, adjust the property as needed
  //     userId = userMetadata?.user_metadata?.user_id ?? null;
  //   }
  //   if (sessionCart) {
  //     // Overwrite any existing user cart
  //     await prisma.cart.deleteMany({
  //       where: { userId: userId },
  //     });

  //     // Assign the guest cart to the logged-in user
  //     await prisma.cart.update({
  //       where: { id: sessionCart.id },
  //       data: { userId: userId },
  //     });
  //   }
  // }

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
