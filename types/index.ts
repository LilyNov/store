import {
  insertCartSchema,
  insertProductSchema,
  cartItemSchema,
  shippingAddressSchema,
  insertAddressSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertPaymentSchema,
  updatePaymentStatusSchema,
  paymentStatusEnum,
} from "@/lib/validators";
import { z } from "zod";

export type Product = z.infer<typeof insertProductSchema> & {
  id: string;
  rating: string;
  createdAt: Date;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
};

export type CartItem = z.infer<typeof cartItemSchema>;

// Full cart as stored in DB
export type Cart = z.infer<typeof insertCartSchema>;

// Totals shape (computed, not stored)
export type CartTotals = {
  itemsPrice: string;
  shippingPrice: string;
  taxPrice: string;
  totalPrice: string;
};

// Cart with computed totals (e.g. getMyCartWithTotals)
export type CartWithTotals = Cart & { totals: CartTotals };

// Flattened variant (legacy components expect itemsPrice directly on cart)
export type CartWithTotalsFlat = Cart & CartTotals;

// Narrow cart item explicit interface (helps avoid "any")
export interface CartItemStrict extends CartItem {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  image: string;
  price: number; // normalized to number in actions layer
  saved?: boolean;
  deletedAt?: Date;
}

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

// Address create input
export type InsertAddressInput = z.infer<typeof insertAddressSchema>;

// Order and related
export type InsertOrderInput = z.infer<typeof insertOrderSchema>;
export type InsertOrderItemInput = z.infer<typeof insertOrderItemSchema>;

// Payment related
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type InsertPaymentInput = z.infer<typeof insertPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<
  typeof updatePaymentStatusSchema
>;

// Address table JSON shapes
export interface UserAddressRecord {
  id: string;
  userId: string;
  shippingAddress?: {
    fullName?: string;
    streetAddress?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lng?: number;
    isPrimary?: boolean;
  } | null;
  billingAddress?: {
    address?: string; // flexible placeholder
    isPrimary?: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

// Payment table record (simplified mirror of Prisma model)
export interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  status: PaymentStatus;
  amount: string; // keep as string to match validated input formatting
  currency: string;
  rawPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Order domain shape (after creation) – aligns with schema
export interface OrderRecord {
  id: string;
  userId: string;
  addressId: string;
  shippingAddressSnapshot?: ShippingAddress | null;
  itemsPrice: string;
  shippingPrice: string;
  taxPrice: string;
  totalPrice: string;
  isPaid: boolean;
  paidAt?: Date | null;
  isDelivered: boolean;
  deliveredAt?: Date | null;
  createdAt: Date;
  orderItems: InsertOrderItemInput[]; // or a dedicated OrderItemRecord if needed later
  payment?: PaymentRecord | null;
}
