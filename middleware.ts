import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/checkout/:path*",
  ],
};

// The Auth0 client is initialized in the lib/auth0.ts file, which is imported here.
// The middleware function is exported and will be used by Next.js to handle requests.
// The config object specifies the matcher patterns for the middleware.
// This setup allows for a clean separation of concerns, keeping the authentication logic modular and reusable across different parts of the application.
// The middleware will automatically handle redirects for unauthenticated users, ensuring they are sent to the login page.
