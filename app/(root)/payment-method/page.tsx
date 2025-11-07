// Deprecated route: payment-method removed in Stripe-only flow.
// Keeping minimal file to avoid 404 if user bookmarked old step.
import { redirect } from "next/navigation";

export default async function DeprecatedPaymentMethodPage() {
  redirect("/place-order");
}
