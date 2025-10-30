import { getMyCart } from "@/lib/actions/cart.actions";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShippingAddress } from "@/types";
import { auth0 } from "@/lib/auth0";
import { decodeJwt } from "@/lib/jwt-utils";
import {
  getUserAddress,
  syncUserWithDatabase,
  getUserFromPrisma,
} from "@/lib/user-service";
import ShippingAddressForm from "./shipping-address-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CheckoutSteps from "@/components/shared/checkout-steps";

export const metadata: Metadata = {
  title: "Shipping Address",
};

const ShippingAddressPage = async () => {
  const cart = await getMyCart();

  if (!cart || cart.items.length === 0) redirect("/cart");

  const session = await auth0.getSession();
  // If unauthenticated, show a friendly login request instead of redirecting immediately.
  if (!session || !session.user) {
    return (
      <>
        <CheckoutSteps current={0} />

        <div className="max-w-md mx-auto py-10 space-y-6">
          <h1 className="h2-bold">Please log in</h1>
          <p className="text-sm text-muted-foreground">
            You need to be authenticated to enter your shipping address.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/login?returnTo=/shipping-address">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/login?screen_hint=signup&returnTo=/shipping-address">
                Sign up
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Authenticated flow
  const idToken = session.tokenSet?.idToken;
  const decodedToken = idToken ? decodeJwt(idToken) : null;
  const userIdFromToken = decodedToken?.user_id; // expected to be our DB UUID custom claim

  // If token lacks our DB user id claim, sync the Auth0 user now to obtain/create DB record
  const effectiveUserId = userIdFromToken
    ? userIdFromToken
    : await syncUserWithDatabase(session.user);

  // Ensure the user still exists (could have been lost after a DB reset)
  const existingUser = await getUserFromPrisma(effectiveUserId);
  let finalUserId = effectiveUserId;
  if (!existingUser) {
    // Re-sync to recreate the user record
    finalUserId = await syncUserWithDatabase(session.user);
  }

  const addressRecord = await getUserAddress(finalUserId);

  return (
    <>
      <CheckoutSteps current={1} />
      <ShippingAddressForm
        address={(addressRecord?.shippingAddress as ShippingAddress) || null}
        userId={finalUserId || null}
      />
    </>
  );
};

export default ShippingAddressPage;
