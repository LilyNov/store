"use server";

import { headers } from "next/headers";
import { stripe } from "../../lib/stripe";

// Server action used by the embedded checkout provider to obtain a client_secret.
// Must always resolve to a valid client secret string.
export async function fetchClientSecret(): Promise<string> {
  // In server actions, the Origin header is often missing; fall back to APP_BASE_URL or localhost.
  const originHeader = (await headers()).get("origin");
  const baseUrl =
    originHeader || process.env.APP_BASE_URL || "http://localhost:3000";

  // Replace with a valid test mode price from your Stripe dashboard.
  const PRICE_ID =
    process.env.STRIPE_PRICE_ID || "price_1SWwe3JoetFLjerOrx4Z5uCI";

  if (!PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      return_url: `${baseUrl}/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    throw new Error(
      `Stripe session creation failed. Price: ${PRICE_ID}. Error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!session.client_secret) {
    throw new Error("Failed to create checkout session: missing client_secret");
  }

  return session.client_secret;
}
