import { formatNumberWithDecimal } from "./utils";

export interface OrderTotalsConfig {
  taxRate?: number; // e.g. 0.07 for 7%
  shippingFlatRate?: number; // base shipping
  freeShippingThreshold?: number; // waive shipping if items >= threshold
}

export interface RawCartItem {
  price: number; // unit price
  quantity: number; // quantity
}

export interface ComputedOrderTotals {
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
}

const DEFAULTS: Required<OrderTotalsConfig> = {
  taxRate: Number(process.env.TAX_RATE || 0),
  shippingFlatRate: Number(process.env.SHIPPING_FLAT_RATE || 0),
  freeShippingThreshold: Number(
    process.env.FREE_SHIPPING_THRESHOLD || Infinity
  ),
};

export function computeOrderTotals(
  items: RawCartItem[],
  cfg: OrderTotalsConfig = {}
): ComputedOrderTotals {
  const { taxRate, shippingFlatRate, freeShippingThreshold } = {
    ...DEFAULTS,
    ...cfg,
  };

  const itemsPrice = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const shippingPrice =
    itemsPrice >= freeShippingThreshold ? 0 : shippingFlatRate;
  const taxPrice = Number((itemsPrice * taxRate).toFixed(2));
  const totalPrice = Number(
    formatNumberWithDecimal(itemsPrice + shippingPrice + taxPrice)
  );

  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
}

export function formatTotals(t: ComputedOrderTotals) {
  // convenience formatting (string with two decimals)
  return {
    itemsPrice: t.itemsPrice.toFixed(2),
    shippingPrice: t.shippingPrice.toFixed(2),
    taxPrice: t.taxPrice.toFixed(2),
    totalPrice: t.totalPrice.toFixed(2),
  };
}
