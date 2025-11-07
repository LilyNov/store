import { stripe } from "@/lib/stripe";
import { markPaymentFailed } from "@/lib/payment-service";
import { prisma } from "@/db/prisma";
import type Stripe from "stripe";

export async function POST(req: Request) {
  if (!stripe) {
    return new Response("Stripe not configured", { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing webhook secret", { status: 500 });

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[webhook] read body error", err);
    return new Response("Unable to read body", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        const checkoutSessionId = session.id as string;
        const paymentIntentId = session.payment_intent as string | null;
        // Find payment by checkout session id
        const payment = await prisma.payment.findFirst({
          where: { stripeCheckoutSessionId: checkoutSessionId },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "succeeded",
              paidAt: new Date(),
              stripePaymentIntentId: paymentIntentId,
            },
          });
          // Create Order if not exists (lookup by paymentId)
          const existingOrder = await prisma.order.findFirst({
            where: { paymentId: payment.id },
          });
          if (!existingOrder) {
            // Build items
            const items =
              (payment.items as unknown as Array<{
                productId: string;
                quantity: number;
                price: number;
                name: string;
                slug: string;
                image: string;
              }>) || [];
            const itemsPrice = items.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            );
            // Fetch shipping address snapshot from Address table (best effort)
            let shippingSnapshot: Record<string, unknown> = {};
            if (payment.userId) {
              const addr = await prisma.address.findFirst({
                where: { userId: payment.userId },
              });
              if (addr?.shippingAddress)
                shippingSnapshot = addr.shippingAddress as Record<
                  string,
                  unknown
                >;
            }
            const order = await prisma.order.create({
              data: {
                userId: payment.userId || undefined,
                shippingAddress: shippingSnapshot || {},
                paymentMethod: "Stripe",
                itemsPrice: itemsPrice,
                shippingPrice: 0,
                taxPrice: 0,
                totalPrice: itemsPrice,
                isPaid: true,
                paidAt: new Date(),
                paymentResult: {
                  checkoutSessionId,
                  paymentIntentId,
                },
                paymentId: payment.id,
                orderItems: {
                  create: items.map((i) => ({
                    productId: i.productId,
                    qty: i.quantity,
                    price: i.price,
                    name: i.name,
                    slug: i.slug,
                    image: i.image,
                  })),
                },
              },
            });
            console.log("[webhook] Order created", order.id);
          }
        }
      } catch (err) {
        console.error("[webhook] checkout.session.completed error", err);
        return new Response("Failed to handle checkout session", {
          status: 500,
        });
      }
      break;
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      try {
        // Hosted Checkout flow finalizes in checkout.session.completed.
        // We only attach the paymentIntentId to existing payment record if missing, avoiding duplicate rows.
        const already = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: intent.id },
        });
        if (!already) {
          const sessionCartId = intent.metadata?.sessionCartId as
            | string
            | undefined;
          if (sessionCartId) {
            const payment = await prisma.payment.findFirst({
              where: {
                sessionCartId,
                stripeCheckoutSessionId: { not: null },
                stripePaymentIntentId: null,
              },
            });
            if (payment) {
              await prisma.payment.update({
                where: { id: payment.id },
                data: { stripePaymentIntentId: intent.id },
              });
            }
          }
        }
        // Do not mark succeeded here to avoid race with checkout.session.completed; that handler sets status & creates order.
      } catch (err) {
        console.error("[webhook] failed to mark success", err);
        return new Response("Failed to update payment", { status: 500 });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      try {
        await markPaymentFailed({
          stripePaymentIntentId: intent.id,
          reason: intent.last_payment_error?.message,
        });
      } catch (err) {
        console.error("[webhook] failed to mark failure", err);
        return new Response("Failed to update payment", { status: 500 });
      }
      break;
    }
    default:
      // Ignore other events
      break;
  }

  return new Response("ok");
}

export const dynamic = "force-dynamic"; // ensure edge/serverless compatibility
