import { getMyCart } from "@/lib/actions/cart.actions";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShippingAddress } from "@/types";
import { auth0 } from "@/lib/auth0";
import { decodeJwt } from "@/lib/jwt-utils";
import { getUserFromPrisma } from "@/lib/user-service";
import ShippingAddressForm from "./shipping-address-form";

export const metadata: Metadata = {
  title: "Shipping Address",
};

const ShippingAddressPage = async () => {
  const cart = await getMyCart();

  if (!cart || cart.items.length === 0) redirect("/cart");

  const session = await auth0.getSession();

  const user = session?.user;

  // !!! decoded token with user metadata
  const idToken = session?.tokenSet?.idToken;
  const decodedToken = idToken ? decodeJwt(idToken) : null;
  console.log(decodedToken.user_id);
  console.log(decodedToken);

  if (!user) {
    throw new Error("User not found");
  }

  const dBUser = await getUserFromPrisma(decodedToken.user_id);
  console.log("DBUSER", dBUser);

  return (
    <>
      <ShippingAddressForm
        address={dBUser?.address as ShippingAddress}
        userId={decodedToken?.user_id || null}
      />
    </>
  );
};

export default ShippingAddressPage;
