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
import { getAuth0UserMetadata } from "@/lib/auth0-management"; // still used in merge for side metadata, not for userId resolution now
import { cartItemSchema, insertCartSchema } from "../validators";
import { Prisma } from "@prisma/client";

// ---------- Types & Helpers ----------
type ActionResult = { success: boolean; message: string };
type CartMutationResult = ActionResult;
// Temporary extended cart shape including new fields until Prisma client regenerated
interface ExtendedCart {
  id: string;
  items: unknown;
  savedItems?: unknown;
  removedItems?: unknown;
}

// Parse unknown JSON array (from Prisma Json[]) into strongly typed CartItem[].
// Fault tolerant: attempts normalization, then Zod parse; on failure salvages minimally valid entries.
const parseCartItems = (items: unknown): CartItem[] => {
  const arr = Array.isArray(items) ? items : [];
  const normalized = arr.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const obj: Record<string, unknown> = {
      ...(raw as Record<string, unknown>),
    };
    if (obj.price != null && typeof obj.price !== "number") {
      const num = Number(obj.price);
      if (!Number.isNaN(num)) obj.price = num;
    }
    if (obj.deletedAt && typeof obj.deletedAt === "string") {
      const d = new Date(obj.deletedAt as string);
      if (!isNaN(d.getTime())) obj.deletedAt = d;
    }
    return obj;
  });
  try {
    return cartItemSchema.array().parse(normalized);
  } catch (err) {
    console.error("parseCartItems: validation failed, attempting salvage", err);
    interface LooseItem {
      [k: string]: unknown;
      productId?: string;
      name?: string;
      slug?: string;
      quantity?: unknown;
      image?: string;
      price?: unknown;
      saved?: unknown;
      deletedAt?: unknown;
    }
    const isLoose = (o: unknown): o is LooseItem =>
      !!o && typeof o === "object";
    const salvaged = normalized
      .filter((o): o is LooseItem => {
        if (!isLoose(o)) return false;
        if (typeof o.productId !== "string") return false;
        const priceNum = Number(o.price);
        if (!Number.isFinite(priceNum)) return false;
        if (!Number.isInteger(o.quantity as number)) return false;
        return true;
      })
      .map((o) => {
        const priceNum = Number(o.price);
        const deletedAtDate =
          o.deletedAt instanceof Date
            ? o.deletedAt
            : typeof o.deletedAt === "string"
            ? new Date(o.deletedAt)
            : undefined;
        return {
          productId: o.productId!,
          name: o.name ?? "UNKNOWN",
          slug: o.slug ?? o.productId,
          quantity: (o.quantity as number) ?? 0,
          image: o.image ?? "",
          price: Number.isNaN(priceNum) ? 0 : priceNum,
          saved: o.saved === true ? true : undefined,
          deletedAt:
            deletedAtDate && !isNaN(deletedAtDate.getTime())
              ? deletedAtDate
              : undefined,
        } as CartItem;
      });
    const safe = cartItemSchema.array().safeParse(salvaged);
    if (safe.success) return safe.data;
    console.error("parseCartItems: salvage failed; returning empty array");
    return [];
  }
};

// Ensure we have a local User row and return its id. We key off email rather than Auth0 metadata
// to avoid foreign key violations caused by mismatched / unsynced external identifiers.
async function ensureLocalUserId(): Promise<string | null> {
  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user) return null;
    const email = user.email as string | undefined;
    if (!email) return null; // cannot map without email
    const name = (user.name as string | undefined) || "NO_NAME";
    const image = (user.picture as string | undefined) || undefined;
    // Upsert guarantees the row exists without relying on Auth0 metadata custom fields.
    const local = await prisma.user.upsert({
      where: { email },
      update: { name, image },
      create: { email, name, image },
    });
    return local.id;
  } catch (e) {
    console.error("ensureLocalUserId failed", e);
    return null;
  }
}

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

// --- Internal helper: claim or merge a session cart into a user cart ---
async function claimOrMergeCart(userId: string, sessionCartId: string) {
  if (!userId || !sessionCartId) return null;
  const sessionOnly = await prisma.cart.findFirst({
    where: { sessionCartId, userId: null },
  });
  const userCart = await prisma.cart.findFirst({ where: { userId } });

  if (!sessionOnly && !userCart) return null;
  if (sessionOnly && !userCart) {
    const claimed = await prisma.cart.update({
      where: { id: sessionOnly.id },
      data: { userId },
    });
    // NOTE: Avoid deleting cookie here because this function can run during a Server Component render
    // which is not an allowed mutation context. A separate server action should clear it after merge.
    // cookieStore.delete("sessionCartId"); // deferred
    return claimed;
  }
  if (!sessionOnly && userCart) {
    // Deferred cookie cleanup (see note above)
    // cookieStore.delete("sessionCartId");
    return userCart;
  }
  if (sessionOnly && userCart && sessionOnly.id !== userCart.id) {
    const mergedMap = new Map<string, CartItem>();
    const push = (raw: unknown) => {
      parseCartItems(raw).forEach((it) => {
        const ex = mergedMap.get(it.productId);
        if (ex) ex.quantity += it.quantity;
        else mergedMap.set(it.productId, { ...it });
      });
    };
    push(sessionOnly.items);
    push(userCart.items);
    const productIds = Array.from(mergedMap.keys());
    if (productIds.length) {
      const stocks = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stock: true },
      });
      const stockMap = new Map(stocks.map((p) => [p.id, p.stock]));
      for (const [pid, itm] of mergedMap) {
        const max = stockMap.get(pid) ?? 0;
        if (itm.quantity > max) itm.quantity = max;
        if (itm.quantity <= 0) mergedMap.delete(pid);
      }
    }
    await prisma.cart.update({
      where: { id: userCart.id },
      data: {
        items: Array.from(
          mergedMap.values()
        ) as unknown as Prisma.InputJsonValue[],
      },
    });
    await prisma.cart.delete({ where: { id: sessionOnly.id } });
    // Deferred cookie cleanup (see note above)
    // cookieStore.delete("sessionCartId");
    return await prisma.cart.findUnique({ where: { id: userCart.id } });
  }
  return null;
}

export async function addItemToCart(data: AddItemInput): Promise<ActionResult> {
  try {
    // sessionCartId cookie may be intentionally deleted after login/merge
    let sessionCartId = (await cookies()).get("sessionCartId")?.value;
    const userId = await ensureLocalUserId();
    if (!userId && !sessionCartId) {
      throw new Error("Cart Session not found");
    }

    // product lookup
    const productId = (data as { productId: string }).productId; // narrow
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    // Resolve cart through helper if both user & session cart exist (merge scenario)
    let cart = null as Awaited<ReturnType<typeof prisma.cart.findFirst>> | null;
    if (userId) {
      cart = sessionCartId
        ? await claimOrMergeCart(userId, sessionCartId)
        : await prisma.cart.findFirst({ where: { userId } });
    } else if (sessionCartId) {
      cart = await prisma.cart.findFirst({ where: { sessionCartId } });
    }

    if (!cart) {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        quantity: 1,
        image: product.images[0] ?? "",
        price: Number(product.price),
      };
      // If user is logged in and sessionCartId missing (post-merge), generate ephemeral id
      if (!sessionCartId) sessionCartId = crypto.randomUUID();
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
    const cookieStore = await cookies();
    const sessionCartId = cookieStore.get("sessionCartId")?.value;
    const userId = await ensureLocalUserId();
    if (!userId && !sessionCartId) throw new Error("Cart Session not found");
    const cart = await prisma.cart.findFirst({
      where: userId
        ? sessionCartId
          ? { OR: [{ userId }, { sessionCartId }] }
          : { userId }
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

// Save an item for later: move from items[] to savedItems[] (retain quantity & meta)
export async function saveItemForLater(
  productId: string
): Promise<CartMutationResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    const userId = await ensureLocalUserId();
    if (!userId && !sessionCartId) throw new Error("Cart Session not found");
    const cart = await prisma.cart.findFirst({
      where: userId
        ? sessionCartId
          ? { OR: [{ userId }, { sessionCartId }] }
          : { userId }
        : { sessionCartId },
    });
    if (!cart) throw new Error("Cart not found");
    const items = parseCartItems(cart.items);
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) throw new Error("Item not found in cart");
    const [removed] = items.splice(idx, 1);
    // Append to savedItems (ensure uniqueness by productId; replace if exists)
    const savedItems = parseCartItems((cart as ExtendedCart).savedItems ?? []);
    const existingIdx = savedItems.findIndex((i) => i.productId === productId);
    if (existingIdx >= 0) savedItems[existingIdx] = { ...removed, saved: true };
    else savedItems.push({ ...removed, saved: true });
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: items as unknown as Prisma.InputJsonValue[],
        savedItems: savedItems as unknown as Prisma.InputJsonValue[],
      },
    });
    return { success: true, message: "Item saved for later" };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

// Move a saved item back into the active cart items[] (adds quantity if already present)
export async function moveSavedItemToCart(
  productId: string
): Promise<CartMutationResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    const userId = await ensureLocalUserId();
    if (!userId && !sessionCartId) throw new Error("Cart Session not found");
    const cart = await prisma.cart.findFirst({
      where: userId
        ? sessionCartId
          ? { OR: [{ userId }, { sessionCartId }] }
          : { userId }
        : { sessionCartId },
    });
    if (!cart) throw new Error("Cart not found");
    const items = parseCartItems(cart.items);
    const savedItems = parseCartItems((cart as ExtendedCart).savedItems ?? []);
    const idx = savedItems.findIndex((i) => i.productId === productId);
    if (idx < 0) throw new Error("Item not in saved list");
    const [saved] = savedItems.splice(idx, 1);
    const existingIdx = items.findIndex((i) => i.productId === productId);
    if (existingIdx >= 0) {
      items[existingIdx].quantity += saved.quantity;
    } else {
      items.push({ ...saved, saved: undefined });
    }
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: items as unknown as Prisma.InputJsonValue[],
        savedItems: savedItems as unknown as Prisma.InputJsonValue[],
      },
    });
    return { success: true, message: "Item moved to cart" };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

// Permanently delete an item from cart OR saved list and track in removedItems with deletedAt timestamp
export async function deleteItem(
  productId: string
): Promise<CartMutationResult> {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    const userId = await ensureLocalUserId();
    if (!userId && !sessionCartId) throw new Error("Cart Session not found");
    const cart = await prisma.cart.findFirst({
      where: userId
        ? sessionCartId
          ? { OR: [{ userId }, { sessionCartId }] }
          : { userId }
        : { sessionCartId },
    });
    if (!cart) throw new Error("Cart not found");
    const items = parseCartItems(cart.items);
    const savedItems = parseCartItems((cart as ExtendedCart).savedItems ?? []);
    const removedItems = parseCartItems(
      (cart as ExtendedCart).removedItems ?? []
    );
    let removed: CartItem | null = null;
    let idx = items.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      removed = items.splice(idx, 1)[0];
    } else {
      idx = savedItems.findIndex((i) => i.productId === productId);
      if (idx >= 0) removed = savedItems.splice(idx, 1)[0];
    }
    if (!removed) throw new Error("Item not found");
    // Track deletion with timestamp (convert to plain object + deletedAt field)
    const deletedEntry: CartItem & { deletedAt: Date } = {
      ...removed,
      deletedAt: new Date(),
    };
    removedItems.push(deletedEntry);
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: items as unknown as Prisma.InputJsonValue[],
        savedItems: savedItems as unknown as Prisma.InputJsonValue[],
        removedItems: removedItems as unknown as Prisma.InputJsonValue[],
      },
    });
    return { success: true, message: "Item deleted" };
  } catch (e) {
    return { success: false, message: formatError(e) };
  }
}

export async function getMyCartWithTotals(): Promise<CartWithTotals | null> {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  const userId = await ensureLocalUserId();
  // If neither identifier exists, nothing to fetch
  if (!sessionCartId && !userId) return null;
  let resolvedCart = null as Awaited<
    ReturnType<typeof prisma.cart.findFirst>
  > | null;
  if (userId) {
    resolvedCart = sessionCartId
      ? await claimOrMergeCart(userId, sessionCartId)
      : await prisma.cart.findFirst({ where: { userId } });
  }
  if (!resolvedCart && sessionCartId) {
    resolvedCart = await prisma.cart.findFirst({ where: { sessionCartId } });
  }
  if (!resolvedCart) return null;
  const plain = convertToPlainObject(resolvedCart);
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

// Extended fetch including savedItems & removedItems (parsed) for richer UI
export async function getMyCartFull(): Promise<
  | (CartWithTotalsFlat & { savedItems: CartItem[]; removedItems: CartItem[] })
  | null
> {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  const userId = await ensureLocalUserId();
  if (!sessionCartId && !userId) return null;
  const cart = await prisma.cart.findFirst({
    where: userId
      ? sessionCartId
        ? { OR: [{ userId }, { sessionCartId }] }
        : { userId }
      : { sessionCartId },
  });
  if (!cart) return null;
  interface PlainCart {
    id: string;
    userId: string | null;
    sessionCartId: string;
    createdAt: Date;
    updatedAt: Date;
    items: unknown;
    savedItems?: unknown;
    removedItems?: unknown;
  }
  const plain = convertToPlainObject(cart) as PlainCart;
  const items = parseCartItems(plain.items);
  const savedItems = parseCartItems(plain.savedItems ?? []);
  const removedItems = parseCartItems(plain.removedItems ?? []);
  const totals = calcTotals(items);
  return {
    id: plain.id,
    userId: plain.userId ?? null,
    sessionCartId: plain.sessionCartId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    items,
    ...totals,
    savedItems,
    removedItems,
  } as CartWithTotalsFlat & {
    savedItems: CartItem[];
    removedItems: CartItem[];
  };
}
