import {
  insertCartSchema,
  insertProductSchema,
  cartItemSchema,
  shippingAddressSchema,
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
