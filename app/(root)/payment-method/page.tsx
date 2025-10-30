import { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import { getUserFromPrisma, syncUserWithDatabase } from "@/lib/user-service";
import { decodeJwt } from "@/lib/jwt-utils";
import { redirect } from "next/navigation";
import PaymentMethodForm from "./payment-method-form";

export const metadata: Metadata = {
  title: "Payment Method",
};

const PaymentMethodPage = async () => {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect("/auth/login?returnTo=/payment-method");
  }

  // Attempt to get DB user id from custom claim set in an Auth0 Action
  const idToken = session.tokenSet?.idToken;
  const decoded = idToken ? decodeJwt(idToken) : null;
  let dbUserId: string | undefined = decoded?.user_id;

  // If claim missing, sync (creates or fetches user & updates metadata in Auth0)
  if (!dbUserId) {
    dbUserId = await syncUserWithDatabase(session.user);
  }

  // Ensure user row exists (handles case of DB reset after token issued)
  let dbUser = await getUserFromPrisma(dbUserId);
  if (!dbUser) {
    dbUserId = await syncUserWithDatabase(session.user);
    dbUser = await getUserFromPrisma(dbUserId);
  }

  // Optional: handle still-missing user gracefully
  if (!dbUser) {
    throw new Error("Unable to locate or create user record");
  }

  return <>Payment Method Form</>;
  //    <PaymentMethodForm preferredPaymentMethod={user.paymentMethod} />
};

export default PaymentMethodPage;
