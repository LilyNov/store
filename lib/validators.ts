import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";

const currency = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    "Price must have exactly two decimal places (e.g., 49.99)"
  );

// Schema for inserting a product
export const insertProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  categoryId: z.string().uuid("Category id must be a valid UUID"),
  brandId: z.string().uuid("Brand id must be a valid UUID"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  stock: z.coerce.number(),
  images: z.array(z.string()).min(1, "Product must have at least one image"),
  isFeatured: z.boolean(),
  banner: z.string().nullable(),
  price: currency,
});

// Cart Schemas

export const cartItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  quantity: z
    .number()
    .int()
    .nonnegative("Quantity must be a non-negative number"),
  image: z.string().min(1, "Image is required"),
  price: z
    .number()
    .refine(
      (value) => /^\d+(\.\d{2})?$/.test(Number(value).toFixed(2)),
      "Price must have exactly two decimal places (e.g., 49.99)"
    ),
  // Optional flags (not always present in active cart items array)
  saved: z.boolean().optional(),
  deletedAt: z.date().optional(),
});

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  sessionCartId: z.string().min(1, "Session cart id is required"),
  userId: z.string().nullable().optional(),
  savedItems: z.array(cartItemSchema).optional().default([]),
  removedItems: z.array(cartItemSchema).optional().default([]),
});

// DB shape (what Prisma returns)
export const cartDbSchema = insertCartSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Optional: cart with totals (computed)
export const cartTotalsSchema = z.object({
  itemsPrice: z.string(),
  shippingPrice: z.string(),
  taxPrice: z.string(),
  totalPrice: z.string(),
});

export const cartWithTotalsSchema = cartDbSchema.extend({
  totals: cartTotalsSchema,
});

export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  streetAddress: z.string().min(3, "Address must be at least 3 characters"),
  city: z.string().min(3, "city must be at least 3 characters"),
  postalCode: z.string().min(3, "Postal code must be at least 3 characters"),
  country: z.string().min(3, "Country must be at least 3 characters"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
