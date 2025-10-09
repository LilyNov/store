"use client";

import { CartWithTotalsFlat, CartItem } from "@/types";
import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  addItemToCart,
  removeItemFromCart,
  saveItemForLater,
  moveSavedItemToCart,
  deleteItem,
} from "@/lib/actions/cart.actions";
import {
  ArrowRight,
  Loader,
  Minus,
  Plus,
  Trash2,
  Bookmark,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useMemo, useState } from "react";
// import { cartItemSchema } from "@/lib/validators"; // no longer needed after server-side parsing

interface CartWithExtras extends CartWithTotalsFlat {
  savedItems: CartItem[];
  removedItems: CartItem[];
}

const CartTable = ({ cart }: { cart?: CartWithExtras | null }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Selection state persisted to localStorage so refresh keeps choices
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derive a stable key representing current product composition so we only
  // re-hydrate selection when the actual set of productIds changes (not on
  // quantity changes or object identity churn).
  const productCompositionKey = useMemo(
    () =>
      cart
        ? cart.items
            .map((i) => i.productId)
            .sort() // order-independent key
            .join(",")
        : "",
    [cart]
  );

  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Hydrate selection from URL (?sel=pid1,pid2) or default to all if empty/invalid
  useEffect(() => {
    if (!cart) {
      setSelectedIds(new Set());
      return;
    }
    const selParam = searchParams.get("sel");
    if (selParam) {
      const allowed = new Set(cart.items.map((i) => i.productId));
      const ids = selParam.split(",").filter((id) => allowed.has(id));
      if (ids.length) {
        setSelectedIds(new Set(ids));
        return;
      }
    }
    // fallback: all
    setSelectedIds(new Set(cart.items.map((i) => i.productId)));
  }, [productCompositionKey, cart, searchParams]);

  // Sync selection -> URL (replace state, no history spam)
  useEffect(() => {
    if (!cart) return;
    // Build new query string preserving existing non-sel params
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const allIds = cart.items.map((i) => i.productId);
    const selectedArray = Array.from(selectedIds);
    const allSelectedNow = selectedArray.length === allIds.length;
    if (allSelectedNow) {
      // Remove param when everything selected (clean URL)
      if (current.has("sel")) {
        current.delete("sel");
      } else {
        return; // nothing to change
      }
    } else {
      current.set("sel", selectedArray.join(","));
    }
    const qs = current.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, productCompositionKey, cart]);

  const allSelected =
    cart && selectedIds.size === cart.items.length && cart.items.length > 0;
  const partiallySelected = cart && selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (!cart) return;
    setSelectedIds(
      allSelected ? new Set() : new Set(cart.items.map((i) => i.productId))
    );
  };

  const toggleOne = (pid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const selectedItems = useMemo(
    () => (cart ? cart.items.filter((i) => selectedIds.has(i.productId)) : []),
    [cart, selectedIds]
  );

  const liveTotals = useMemo(() => {
    if (!cart) return null;
    return calcCartTotals(selectedItems);
  }, [cart, selectedItems]);

  // Safely parse savedItems if present (the prop cart doesn't yet type them)
  const savedItems = cart ? cart.savedItems : [];

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
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Select all"
                      checked={
                        allSelected
                          ? true
                          : partiallySelected
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell className="w-8 align-middle">
                      <Checkbox
                        aria-label={`Select ${item.name}`}
                        checked={selectedIds.has(item.productId)}
                        onCheckedChange={() => toggleOne(item.productId)}
                      />
                    </TableCell>
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
                        onClick={() => {
                          startTransition(() => {
                            removeItemFromCart(item.productId).then((res) => {
                              if (!res.success) {
                                toast({
                                  variant: "destructive",
                                  description: res.message,
                                });
                              }
                              // Refresh to get updated cart state
                              router.refresh();
                            });
                          });
                        }}
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
                        onClick={() => {
                          startTransition(() => {
                            addItemToCart(item).then((res) => {
                              if (!res.success) {
                                toast({
                                  variant: "destructive",
                                  description: res.message,
                                });
                              }
                              router.refresh();
                            });
                          });
                        }}
                      >
                        {isPending ? (
                          <Loader className="w-4 h-4  animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-y-2">
                      <div>${item.price}</div>
                      <div className="flex gap-2 justify-end">
                        {cart?.userId && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(() => {
                                saveItemForLater(item.productId).then((res) => {
                                  if (!res.success) {
                                    toast({
                                      variant: "destructive",
                                      description: res.message,
                                    });
                                  }
                                  router.refresh();
                                });
                              });
                            }}
                          >
                            <Bookmark className="w-4 h-4" />
                            <span className="sr-only">Save for later</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(() => {
                              deleteItem(item.productId).then((res) => {
                                if (!res.success) {
                                  toast({
                                    variant: "destructive",
                                    description: res.message,
                                  });
                                }
                                router.refresh();
                              });
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell />
                  <TableCell colSpan={1} className="text-right font-medium">
                    Items Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liveTotals?.itemsPrice || 0)}
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
                <span>Estimated Shipping:</span>
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
                  startTransition(() => {
                    if (!selectedItems.length) {
                      toast({
                        variant: "destructive",
                        description: "Select at least one item",
                      });
                      return;
                    }
                    router.push("/shipping-address");
                  })
                }
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader className="animate-spin w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Proceed to Checkout ({selectedItems.length})
              </Button>
            </CardContent>
          </Card>
          {/* Saved For Later Section (full width under main grid) */}
          {cart?.userId && savedItems.length > 0 && (
            <div className="md:col-span-4 mt-8">
              <h2 className="h3-bold mb-4">Saved For Later</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedItems.map((item) => (
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
                          />
                          <span className="px-2">{item.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right space-y-2">
                        <div>${item.price}</div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(() => {
                                moveSavedItemToCart(item.productId).then(
                                  (res) => {
                                    if (!res.success) {
                                      toast({
                                        variant: "destructive",
                                        description: res.message,
                                      });
                                    }
                                    router.refresh();
                                  }
                                );
                              });
                            }}
                          >
                            Move to cart
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(() => {
                                deleteItem(item.productId).then((res) => {
                                  if (!res.success) {
                                    toast({
                                      variant: "destructive",
                                      description: res.message,
                                    });
                                  }
                                  router.refresh();
                                });
                              });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default CartTable;
