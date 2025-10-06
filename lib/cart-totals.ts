import { CartItem, CartTotals } from "@/types";
import { round2 } from "./utils";

/**
 * Pure client-safe cart totals calculator (mirrors server logic)
 */
export function calcCartTotals(items: CartItem[]): CartTotals {
  const itemsPriceNum = round2(
    items.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0)
  );
  const shippingPriceNum = round2(itemsPriceNum > 100 ? 0 : 10);
  const taxPriceNum = round2(0.15 * itemsPriceNum);
  const totalPriceNum = round2(itemsPriceNum + shippingPriceNum + taxPriceNum);
  return {
    itemsPrice: itemsPriceNum.toFixed(2),
    shippingPrice: shippingPriceNum.toFixed(2),
    taxPrice: taxPriceNum.toFixed(2),
    totalPrice: totalPriceNum.toFixed(2),
  };
}
