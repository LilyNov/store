"use server";

import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";
import {
  CartItem,
  CartTotals,
  CartWithTotals,
  CartWithTotalsFlat,
} from "@/types";
import { revalidatePath } from "next/cache";
// import { z } from "zod";
import { formatError } from "../utils";
// import { cartItemSchema, insertCartSchema } from "../validators";
import { prisma } from "@/db/prisma";
// import { Prisma } from "@prisma/client";
import { convertToPlainObject, round2 } from "../utils";
import { getAuth0UserMetadata } from "@/lib/auth0-management";
import { cartItemSchema, insertCartSchema } from "../validators";
import { Prisma } from "@prisma/client";

// ---------- Types & Helpers ----------
type ActionResult = { success: boolean; message: string };

// Parse unknown JSON array (from Prisma Json[]) into strongly typed CartItem[]
const parseCartItems = (items: unknown): CartItem[] =>
  cartItemSchema.array().parse(items ?? []);

// Recalculate totals for a cart (internal helper)
const calcTotals = (rawItems: unknown): CartTotals => {
  const items = parseCartItems(rawItems);
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + shippingPrice + taxPrice);
  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};
// Accept either a plain object with productId or a CartItem; only productId is used.
type AddItemInput = { productId: string } | Pick<CartItem, "productId">;

export async function addItemToCart(data: AddItemInput): Promise<ActionResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart Session not found");

    let userId: string | null = null;
    const session = await auth0.getSession();
    const userSessionId = session?.user.sub;
    if (userSessionId) {
      const meta = await getAuth0UserMetadata(userSessionId);
      userId = meta?.user_metadata?.user_id ?? null;
    }

    // product lookup
    const productId = (data as { productId: string }).productId; // narrow
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    // fetch or create cart
    let cart = await prisma.cart.findFirst({
      where: userId
        ? { OR: [{ userId }, { sessionCartId }] }
        : { sessionCartId },
    });

    if (!cart) {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        quantity: 1,
        image: product.images[0] ?? "",
        price: Number(product.price),
      };
      const parsed = insertCartSchema.parse({
        userId,
        sessionCartId,
        items: [newItem],
      });
      cart = await prisma.cart.create({
        data: {
          userId: parsed.userId,
          sessionCartId: parsed.sessionCartId,
          items: parsed.items as unknown as Prisma.InputJsonValue[],
        },
      });
      revalidatePath(`/product/${product.slug}`);
      return { success: true, message: `${product.name} added to cart` };
    }

    const items = parseCartItems(cart.items);
    const idx = items.findIndex((i) => i.productId === product.id);

    if (idx >= 0) {
      const currentQty = items[idx].quantity;
      if (product.stock < currentQty + 1) throw new Error("Not enough stock");
      items[idx].quantity = currentQty + 1;
    } else {
      if (product.stock < 1) throw new Error("Not enough stock");
      items.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        quantity: 1,
        image: product.images[0] ?? "",
        price: Number(product.price),
      });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: items as unknown as Prisma.InputJsonValue[] },
    });

    revalidatePath(`/product/${product.slug}`);
    return {
      success: true,
      message: `${product.name} ${idx >= 0 ? "updated in" : "added to"} cart`,
    };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

// ...existing code...

export async function mergeSessionCartIntoUserCart(): Promise<ActionResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) return { success: true, message: "No session cart" };

    const session = await auth0.getSession();
    const userSessionId = session?.user.sub;
    if (!userSessionId) return { success: true, message: "User not logged in" };

    const meta = await getAuth0UserMetadata(userSessionId);
    const userId = meta?.user_metadata?.user_id;
    if (!userId) return { success: false, message: "User id missing" };

    const sessionCart = await prisma.cart.findFirst({
      where: { sessionCartId, userId: null },
    });

    const userCart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!sessionCart && !userCart)
      return { success: true, message: "No carts to merge" };

    if (sessionCart && !userCart) {
      await prisma.cart.update({
        where: { id: sessionCart.id },
        data: { userId },
      });
      return { success: true, message: "Session cart claimed by user" };
    }

    if (!sessionCart && userCart) {
      return { success: true, message: "User cart already exists" };
    }

    // Merge
    const mergedMap = new Map<string, CartItem>();
    const pushItems = (arr: unknown) => {
      const parsed = parseCartItems(arr);
      parsed.forEach((item) => {
        const existing = mergedMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedMap.set(item.productId, { ...item });
        }
      });
    };
    pushItems(sessionCart!.items);
    pushItems(userCart!.items);

    // Clamp to stock
    const productIds = Array.from(mergedMap.keys());
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, p.stock]));
    for (const [pid, item] of mergedMap) {
      const stock = stockMap.get(pid) ?? 0;
      if (item.quantity > stock) item.quantity = stock;
      if (item.quantity <= 0) mergedMap.delete(pid);
    }

    await prisma.cart.update({
      where: { id: userCart!.id },
      data: {
        items: Array.from(
          mergedMap.values()
        ) as unknown as Prisma.InputJsonValue[],
      },
    });

    // Remove session-only cart
    await prisma.cart.delete({ where: { id: sessionCart!.id } });

    return { success: true, message: "Carts merged" };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

export async function removeItemFromCart(
  productId: string
): Promise<ActionResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart Session not found");
    let userId: string | null = null;
    const session = await auth0.getSession();
    const userSessionId = session?.user.sub;
    if (userSessionId) {
      const meta = await getAuth0UserMetadata(userSessionId);
      userId = meta?.user_metadata?.user_id ?? null;
    }
    const cart = await prisma.cart.findFirst({
      where: userId
        ? { OR: [{ userId }, { sessionCartId }] }
        : { sessionCartId },
    });
    if (!cart) throw new Error("Cart not found");
    const items = parseCartItems(cart.items);
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) throw new Error("Item not found");
    if (items[idx].quantity > 1) {
      items[idx].quantity -= 1;
    } else {
      items.splice(idx, 1);
    }
    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: items as unknown as Prisma.InputJsonValue[] },
    });
    return { success: true, message: "Cart updated" };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

export async function getMyCartWithTotals(): Promise<CartWithTotals | null> {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  if (!sessionCartId) return null;
  let userId: string | null = null;
  const session = await auth0.getSession();
  const userSessionId = session?.user.sub;
  if (userSessionId) {
    const meta = await getAuth0UserMetadata(userSessionId);
    userId = meta?.user_metadata?.user_id ?? null;
  }
  const cart = await prisma.cart.findFirst({
    where: userId ? { OR: [{ userId }, { sessionCartId }] } : { sessionCartId },
  });
  if (!cart) return null;
  const plain = convertToPlainObject(cart);
  const items = parseCartItems(plain.items);
  const totals = calcTotals(items);
  const shaped: CartWithTotals = {
    ...(plain as unknown as Omit<CartWithTotals, "items" | "totals">),
    items,
    totals,
  };
  return shaped;
}

// Convenience: flattened version matching legacy component expectations (itemsPrice at top level)
export async function getMyCart(): Promise<CartWithTotalsFlat | null> {
  const cart = await getMyCartWithTotals();
  if (!cart) return null;
  const { totals, ...rest } = cart;
  return { ...rest, ...totals } as CartWithTotalsFlat;
}
