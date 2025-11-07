"use client";
import { useEffect, useState } from "react";

interface Props {
  sessionId: string;
  initialStatus: string;
}

export function PaymentStatusClient({ sessionId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(initialStatus !== "succeeded");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStatus === "succeeded") return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/payment-status/${sessionId}`);
        if (!res.ok) {
          if (res.status === 404) {
            // Keep polling; webhook may not have written yet
          } else {
            setError(`Status fetch failed (${res.status})`);
          }
          return;
        }
        const json = await res.json();
        if (!active) return;
        setStatus(json.status);
        if (json.order) {
          setOrderId(json.order.id);
          setItems(json.order.items || []);
        }
        if (json.status === "succeeded") {
          setLoading(false);
        }
      } catch (e: any) {
        setError(e.message || "Unknown error");
      }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, initialStatus]);

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Processing payment… waiting for Stripe confirmation.
        </p>
        <div className="h-2 w-48 bg-gray-200 rounded overflow-hidden">
          <div className="animate-pulse h-full bg-gray-400" />
        </div>
        <p className="text-xs text-muted-foreground">
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (status !== "succeeded") {
    return <div className="text-red-600">Payment status: {status}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payment Success</h2>
      {orderId ? (
        <div className="space-y-2">
          <p className="text-sm">Order ID: {orderId}</p>
          <table className="text-sm w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.productId} className="border-t">
                  <td className="p-2">{i.name}</td>
                  <td className="p-2 text-right">{i.qty}</td>
                  <td className="p-2 text-right">
                    ${Number(i.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-green-700">
            Your order has been placed successfully.
          </p>
        </div>
      ) : (
        <p className="text-sm">
          Payment succeeded. Finalizing order… (you can refresh if it takes too
          long)
        </p>
      )}
      <a href="/" className="text-blue-600 underline text-sm">
        Continue shopping
      </a>
    </div>
  );
}
