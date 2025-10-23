"use server";

import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "../utils";
import { LATEST_PRODUCTS_LIMIT } from "../constants";

// Get the latest products
export async function getLatestProducts() {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: "desc" },
    include: { brand: true, category: true },
  });
  return convertToPlainObject(
    data.map((p) => ({
      ...p,
      brand: p.brand?.name,
      category: p.category?.name,
    }))
  );
}

// Get single product by slug
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug },
    include: { brand: true, category: true },
  });
  return product
    ? {
        ...product,
        brand: product.brand?.name,
        category: product.category?.name,
      }
    : null;
}
