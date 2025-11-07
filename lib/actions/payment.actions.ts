"use server";

import { stripe } from "@/lib/stripe";
import { createPaymentRecord } from "@/lib/payment-service";
import { formatError } from "@/lib/utils";
import { getMyCartWithTotals } from "@/lib/actions/cart.actions";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/db/prisma";
import type { Prisma } from "@prisma/client";
import { SERVER_URL } from "@/lib/constants";

export async function createStripePaymentIntent() {
  try {
    if (!stripe) throw new Error("Stripe not configured");
    const cart = await getMyCartWithTotals();
    if (!cart || cart.items.length === 0)
      throw new Error("Cart is empty or missing");
    // Parse totals; they are stored as strings (e.g. "49.99")
    const total = Number(cart.totals.totalPrice);
    if (!Number.isFinite(total)) throw new Error("Invalid cart total");
    const session = await auth0.getSession();
    const userIdClaim = session?.tokenSet?.idToken
      ? (JSON.parse(
          Buffer.from(
            session.tokenSet.idToken.split(".")[1],
            "base64"
          ).toString()
        ).user_id as string | undefined)
      : undefined;
    const userId = userIdClaim || null;

    // Create Stripe PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // convert to cents
      currency: "usd",
      metadata: {
        sessionCartId: cart.sessionCartId,
        userId: userId || "guest",
      },
      automatic_payment_methods: { enabled: true },
    });

    // Snapshot items & create payment record (pending)
    // Normalize items for JSON (strip Date objects)
    const jsonItems = cart.items.map((i) => ({
      ...i,
      deletedAt: i.deletedAt ? i.deletedAt.toISOString() : undefined,
    }));
    await createPaymentRecord({
      userId,
      sessionCartId: cart.sessionCartId,
      items: jsonItems,
      amount: total,
      currency: "usd",
      stripePaymentIntentId: intent.id,
    });

    return { success: true, clientSecret: intent.client_secret };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Hosted Stripe Checkout Session (preferred for quick integration).
// Returns a URL to redirect the user to Stripe's hosted payment page.
export async function createStripeCheckoutSession() {
  try {
    if (!stripe) throw new Error("Stripe not configured");
    const cart = await getMyCartWithTotals();
    if (!cart || cart.items.length === 0)
      throw new Error("Cart is empty or missing");
    const total = Number(cart.totals.totalPrice);
    if (!Number.isFinite(total)) throw new Error("Invalid cart total");

    const session = await auth0.getSession();
    const userIdClaim = session?.tokenSet?.idToken
      ? (JSON.parse(
          Buffer.from(
            session.tokenSet.idToken.split(".")[1],
            "base64"
          ).toString()
        ).user_id as string | undefined)
      : undefined;
    const userId = userIdClaim || null;

    // (Shipping address snapshot intentionally omitted for now.)

    // Stripe line items (use product metadata from cart snapshot)
    const lineItems = cart.items.map((i) => ({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(i.price * 100),
        product_data: {
          name: i.name,
          // Stripe requires fully-qualified image URLs; local relative paths cause 'Not a valid url'.
          images: (() => {
            if (!i.image) return [] as string[];
            const raw = i.image.trim();
            const full = raw.startsWith("http")
              ? raw
              : `${SERVER_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
            try {
              // Basic validation
              new URL(full);
              return [full];
            } catch {
              return []; // fallback: omit invalid URL
            }
          })(),
          metadata: { slug: i.slug, productId: i.productId },
        },
      },
      quantity: i.quantity,
    }));

    const successUrl = `${SERVER_URL}/place-order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${SERVER_URL}/place-order?canceled=1`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId || "guest",
        sessionCartId: cart.sessionCartId,
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "DE", "FR"],
      },
    });

    // Normalize items for JSON (strip Dates)
    const jsonItems: Prisma.JsonValue = cart.items.map((i) => ({
      ...i,
      deletedAt: i.deletedAt ? i.deletedAt.toISOString() : undefined,
    }));
    await createPaymentRecord({
      userId,
      sessionCartId: cart.sessionCartId,
      items: jsonItems,
      amount: total,
      currency: "usd",
      stripePaymentIntentId: null, // will be set after completion
    });

    // Update payment row with checkout session id (requires lookup by intent later)
    await prisma.payment.updateMany({
      where: {
        sessionCartId: cart.sessionCartId,
        stripeCheckoutSessionId: null,
      },
      data: { stripeCheckoutSessionId: checkoutSession.id },
    });

    return { success: true, url: checkoutSession.url };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
