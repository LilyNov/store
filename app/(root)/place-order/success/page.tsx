import { prisma } from "@/db/prisma";
import { PaymentStatusClient } from "./payment-status-client";
import Link from "next/link";

export const dynamic = "force-dynamic"; // ensure latest DB state

type SearchParams = { [key: string]: string | string[] | undefined };
function isPromise<T>(val: unknown): val is Promise<T> {
  return !!val && typeof val === "object" && "then" in (val as object);
}

export default async function SuccessPage(props: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const raw = props.searchParams
    ? isPromise<SearchParams>(props.searchParams)
      ? await props.searchParams
      : props.searchParams
    : undefined;
  const sessionId = typeof raw?.session_id === "string" ? raw.session_id : null;

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Missing session ID</h1>
        <p className="text-sm text-muted-foreground">
          We could not determine the payment session. If you just completed a
          payment, please return to{" "}
          <Link href="/place-order" className="underline">
            Place Order
          </Link>
          .
        </p>
      </div>
    );
  }

  // Fetch payment & eager-load orders if already created
  const payment = await prisma.payment.findFirst({
    where: { stripeCheckoutSessionId: sessionId },
    include: { orders: { include: { orderItems: true } } },
  });

  const status = payment?.status || "pending";
  const order = payment?.orders[0] || null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Payment Result</h1>
      <div className="rounded border p-4 space-y-4 bg-white/50">
        <div className="text-sm">
          <span className="font-medium">Stripe Session:</span> {sessionId}
        </div>
        <PaymentStatusClient sessionId={sessionId} initialStatus={status} />
      </div>
      {order && (
        <div className="rounded border p-4 space-y-2">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <p className="text-sm">Order ID: {order.id}</p>
          <p className="text-sm">Items: {order.orderItems.length}</p>
        </div>
      )}
    </div>
  );
}
