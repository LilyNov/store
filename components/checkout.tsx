"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { fetchClientSecret as fetchClientSecretAction } from "../app/actions/stripe";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

// Client wrapper that calls the server action. EmbeddedCheckoutProvider expects a client function.
const fetchClientSecret = async (): Promise<string> => {
  return await fetchClientSecretAction();
};

export default function Checkout() {
  if (!stripePromise) {
    return (
      <div id="checkout" className="text-sm text-red-600">
        Stripe publishable key missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        in .env.local and restart dev server.
      </div>
    );
  }
  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
