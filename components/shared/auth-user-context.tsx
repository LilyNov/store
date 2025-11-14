import Link from "next/link";
import { Button } from "@/components/ui/button";
import CheckoutSteps from "@/components/shared/checkout-steps";
import { decodeJwt } from "@/lib/jwt-utils";
import { syncUserWithDatabase, getUserFromPrisma } from "@/lib/user-service";
import { auth0 } from "@/lib/auth0";
// Using a minimal Auth0 user shape (avoid depending on non-exported types)
type Auth0User = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  [key: string]: unknown;
};

// Reusable server component that encapsulates auth + DB user resolution logic.
// Usage:
// <AuthUserGate step={STEP_INDEX} render={(ctx) => ctx.userId ? <Private /> : <Public /> } />

export interface AuthUserGateContext {
  sessionUser: Auth0User | null; // Auth0 user profile if logged in
  userId: string | null; // database user id (UUID) or null if not resolved
  loading: boolean; // future-proof for streaming states
}

interface AuthUserGateProps {
  step?: number; // checkout step index for optional steps component
  render: (context: AuthUserGateContext) => React.ReactNode;
  requireAuth?: boolean; // if true, show login/signup block instead of calling render when unauthenticated
  loginReturnTo?: string; // destination after login/signup
  loginTitle?: string; // custom title for unauthenticated prompt
  loginMessage?: string; // custom message for unauthenticated prompt
}

export default async function AuthUserGate({
  step,
  render,
  requireAuth = false,
  loginReturnTo = "/shipping-address",
  loginTitle = "Please log in",
  loginMessage = "You need to be authenticated to continue.",
}: AuthUserGateProps) {
  const session = await auth0.getSession();
  const sessionUser = session?.user || null;

  if (!sessionUser && requireAuth) {
    const encodedReturn = encodeURIComponent(loginReturnTo);
    return (
      <>
        {typeof step === "number" && <CheckoutSteps current={step} />}
        <div className="max-w-md mx-auto py-10 space-y-6">
          <h1 className="h2-bold">{loginTitle}</h1>
          <p className="text-sm text-muted-foreground">{loginMessage}</p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/auth/login?returnTo=${encodedReturn}`}>Log in</Link>
            </Button>
            <Button asChild>
              <Link
                href={`/auth/login?screen_hint=signup&returnTo=${encodedReturn}`}
              >
                Sign up
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Attempt to resolve database user id from token or sync if missing
  let dbUserId: string | null = null;
  try {
    const idToken = session?.tokenSet?.idToken;
    const decoded = idToken ? decodeJwt(idToken) : null;
    const claimId = decoded?.user_id as string | undefined;
    if (claimId) {
      dbUserId = claimId;
      const existing = await getUserFromPrisma(claimId);
      if (!existing && sessionUser) {
        dbUserId = await syncUserWithDatabase(sessionUser);
      }
    } else if (sessionUser) {
      dbUserId = await syncUserWithDatabase(sessionUser);
    }
  } catch (err) {
    console.warn("AuthUserGate: Failed to resolve DB user id", err);
  }

  return render({ sessionUser, userId: dbUserId, loading: false });
}
