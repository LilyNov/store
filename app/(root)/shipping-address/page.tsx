import { getMyCart } from "@/lib/actions/cart.actions";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShippingAddress } from "@/types";
import { getUserAddress } from "@/lib/user-service";
import { getUserId } from "@/lib/actions/user.actions";
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

  const { userId } = await getUserId();
  if (!userId) {
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

  const addressRecord = await getUserAddress(userId);

  return (
    <>
      <CheckoutSteps current={1} />
      <ShippingAddressForm
        address={(addressRecord?.shippingAddress as ShippingAddress) || null}
        userId={userId}
      />
    </>
  );
};

export default ShippingAddressPage;
