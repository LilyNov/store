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
  // Return with full relation objects so UI can use brand.name / category.name
  return convertToPlainObject(data);
}

// Get single product by slug
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug },
    include: { brand: true, category: true },
  });
  return product ? convertToPlainObject(product) : null;
}

// Fetch all categories (for product creation UI select list)
export async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return convertToPlainObject(categories);
}

// Fetch all brands (for product creation UI select list)
export async function getBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return convertToPlainObject(brands);
}
