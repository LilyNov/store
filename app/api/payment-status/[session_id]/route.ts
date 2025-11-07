import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

// Use inline typing + camelCase alias to avoid lint/style errors on snake_case param name.
// In newer Next.js versions dynamic route params may be resolved async; await context.params.
type SessionParams = { session_id?: string };
interface SyncContext {
  params: SessionParams;
}
interface AsyncContext {
  params: Promise<SessionParams>;
}

export async function GET(_req: Request, context: SyncContext | AsyncContext) {
  // Detect promise vs object without using any casts
  const maybePromise = (context as AsyncContext).params;
  // Narrow without any: check for 'then' property using type predicate
  function isPromise<T>(val: unknown): val is Promise<T> {
    return !!val && typeof val === "object" && "then" in (val as object);
  }
  const resolved: SessionParams = isPromise<SessionParams>(maybePromise)
    ? await maybePromise
    : (context as SyncContext).params;
  const sessionId = resolved.session_id;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing session_id" }), {
      status: 400,
    });
  }
  try {
    const payment = await prisma.payment.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      include: { orders: { include: { orderItems: true } } },
    });
    if (!payment) {
      return new Response(
        JSON.stringify({ status: "not_found", session_id: sessionId }),
        { status: 404 }
      );
    }
    const order = payment.orders[0] || null;
    return new Response(
      JSON.stringify({
        status: payment.status,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt,
        },
        order: order
          ? {
              id: order.id,
              totalPrice: order.totalPrice,
              isPaid: order.isPaid,
              paidAt: order.paidAt,
              items: order.orderItems.map((i) => ({
                productId: i.productId,
                name: i.name,
                slug: i.slug,
                qty: i.qty,
                price: i.price,
                image: i.image,
              })),
            }
          : null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[payment-status] error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
}
