import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import CheckoutSteps from "@/components/shared/checkout-steps";
import { getMyCartWithTotals } from "@/lib/actions/cart.actions";
import PlaceOrderClient from "./place-order.client";

export const metadata: Metadata = { title: "Place Order" };

const PlaceOrderPage = async () => {
  // Require login (guest flow could be supported; adjust if needed)
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/place-order");

  const cart = await getMyCartWithTotals();
  if (!cart || cart.items.length === 0) redirect("/cart");

  return (
    <div className="space-y-6">
      <CheckoutSteps current={2} />
      <h1 className="h2-bold">Review & Place Order</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="border p-4 rounded-md">
            <h2 className="font-semibold mb-2">Items</h2>
            <ul className="space-y-2">
              {cart.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border p-4 rounded-md space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Items</span>
              <span>${cart.totals.itemsPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${cart.totals.shippingPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${cart.totals.taxPrice}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>${cart.totals.totalPrice}</span>
            </div>
          </div>
          <PlaceOrderClient />
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderPage;
