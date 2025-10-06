"use client";

import { CartWithTotalsFlat } from "@/types";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { ArrowRight, Loader, Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
import { formatCurrency } from "@/lib/utils";
import { calcCartTotals } from "@/lib/cart-totals";

const CartTable = ({ cart }: { cart?: CartWithTotalsFlat | null }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Derive totals (cart already flattened may have itemsPrice etc.)
  const derivedTotals = cart
    ? {
        itemsPrice: cart.itemsPrice,
        shippingPrice: cart.shippingPrice,
        taxPrice: cart.taxPrice,
        totalPrice: cart.totalPrice,
      }
    : null;
  const liveTotals =
    !derivedTotals && cart ? calcCartTotals(cart.items) : derivedTotals;

  return (
    <>
      <h1 className="py-4 h2-bold">Shopping Cart</h1>
      {!cart || cart.items.length === 0 ? (
        <div>
          Cart is empty. <Link href="/">Go shopping</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 md:gap-5">
          <div className="overflow-x-auto md:col-span-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
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
                    <TableCell className="flex-center gap-2">
                      <Button
                        disabled={isPending}
                        variant="outline"
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await removeItemFromCart(
                              item.productId
                            );
                            if (!res.success) {
                              toast({
                                variant: "destructive",
                                description: res.message,
                              });
                            }
                          })
                        }
                      >
                        {isPending ? (
                          <Loader className="w-4 h-4  animate-spin" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </Button>
                      <span>{item.quantity}</span>
                      <Button
                        disabled={isPending}
                        variant="outline"
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await addItemToCart(item);
                            if (!res.success) {
                              toast({
                                variant: "destructive",
                                description: res.message,
                              });
                            }
                          })
                        }
                      >
                        {isPending ? (
                          <Loader className="w-4 h-4  animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">${item.price}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-medium">
                    Items Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liveTotals?.itemsPrice || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-medium">
                    Shipping
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liveTotals?.shippingPrice || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-medium">
                    Tax
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liveTotals?.taxPrice || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(liveTotals?.totalPrice || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <Card>
            <CardContent className="p-4   gap-4">
              <div className="pb-2 text-lg font-medium flex justify-between">
                <span>Items:</span>
                <span>{formatCurrency(liveTotals?.itemsPrice || 0)}</span>
              </div>
              <div className="pb-2 flex justify-between">
                <span>Shipping:</span>
                <span>{formatCurrency(liveTotals?.shippingPrice || 0)}</span>
              </div>
              <div className="pb-2 flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(liveTotals?.taxPrice || 0)}</span>
              </div>
              <div className="pb-4 text-xl font-semibold flex justify-between border-t pt-3">
                <span>Total:</span>
                <span>{formatCurrency(liveTotals?.totalPrice || 0)}</span>
              </div>
              <Button
                onClick={() =>
                  startTransition(() => router.push("/shipping-address"))
                }
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader className="animate-spin w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default CartTable;
