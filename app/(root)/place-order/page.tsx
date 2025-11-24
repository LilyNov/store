import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyCart } from "@/lib/actions/cart.actions";
import { formatCurrency } from "@/lib/utils";
import type { ShippingAddress } from "@/types";
import AuthUserGate from "@/components/shared/auth-user-context";
import { getUserAddress } from "@/lib/user-service";
import { computeOrderTotals } from "@/lib/order-totals";
import Checkout from "@/components/checkout";

export const metadata = {
  title: "Place Order",
};

const placeOrderPage = async () => {
  const cart = await getMyCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  return (
    <AuthUserGate
      step={3}
      requireAuth={true}
      loginReturnTo="/place-order"
      loginTitle="Sign in to place your order"
      loginMessage="We need your account to associate this purchase."
      render={async ({ userId }) => {
        if (!userId) {
          // AuthUserGate with requireAuth already renders login UI; nothing else here.
          return null;
        }
        const addressRecord = await getUserAddress(userId);
        if (!addressRecord?.shippingAddress) redirect("/shipping-address");
        const shipping =
          addressRecord.shippingAddress as ShippingAddress | null;
        const totalsRaw = computeOrderTotals(
          cart.items.map((i) => ({ price: i.price, quantity: i.quantity }))
        );
        // const totals = formatTotals(totalsRaw); // formatted strings available if needed
        return (
          <>
            <h1 className="py-4 text-2xl">Place Order</h1>
            <div className="grid md:grid-cols-3 md:gap-5">
              <div className="overflow-x-auto md:col-span-2 space-y-4">
                {/* Order summary + address */}
                <Card>
                  <CardContent className="p-4 gap-4">
                    <h2 className="text-xl pb-4">Shipping Address</h2>
                    {shipping && (
                      <>
                        <p>{shipping.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {shipping.streetAddress}, {shipping.city},{" "}
                          {shipping.postalCode}, {shipping.country}
                        </p>
                        <div className="mt-3">
                          <Link href="/shipping-address">
                            <Button variant="outline">Edit</Button>
                          </Link>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                {/* items table */}
                <Card>
                  <CardContent className="p-4 gap-4">
                    <h2 className="text-xl pb-4">Order Items</h2>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.items.map((item) => (
                          <TableRow key={item.slug}>
                            <TableCell>
                              <Link
                                href={`/product/${item.slug}`}
                                className="flex items-center"
                              >
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={50}
                                  height={50}
                                ></Image>
                                <span className="px-2">{item.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">{item.qty}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.price}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Link href="/cart">
                      <Button variant="outline">Edit</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
              {/* Order totals */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h2 className="font-semibold">Summary</h2>
                    <div className="flex justify-between text-sm">
                      <span>Items</span>
                      <span>{formatCurrency(totalsRaw.itemsPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>{formatCurrency(totalsRaw.shippingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatCurrency(totalsRaw.taxPrice)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(totalsRaw.totalPrice)}</span>
                    </div>
                    <Checkout />
                    {/* <Button className="w-full mt-2" disabled>
                      Place Order (Stripe TBD)
                    </Button> */}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    />
  );
};

export default placeOrderPage;
