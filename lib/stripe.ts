import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Intentionally silent in production logs; developer feedback only.
  console.warn("[stripe] Missing STRIPE_SECRET_KEY env var. Stripe disabled.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);
