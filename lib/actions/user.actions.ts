"use server";

import { prisma } from "@/db/prisma";
import { ShippingAddress } from "@/types";
import { revalidatePath } from "next/cache";
import { shippingAddressSchema } from "../validators";
import { formatError } from "../utils";

// fetch all users from my Prisma DB
export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return { users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { error: "Failed to fetch users" };
  }
}

// toggle user blocked status and update in Prisma DB
export async function toggleUserBlocked(userId: string, currentStatus: number) {
  try {
    // Toggle between 0 and 1
    const newStatus = currentStatus === 0 ? 1 : 0;

    await prisma.user.update({
      where: { id: userId },
      data: { blocked: newStatus },
    });

    // Revalidate the page to refresh the data
    revalidatePath("/manage");

    return { success: true };
  } catch (error) {
    console.error("Error toggling user blocked status:", error);
    return { error: "Failed to update user status" };
  }
}

export async function updateUserAddress(
  data: ShippingAddress,
  userId?: string | null
) {
  try {
    if (!userId) throw new Error("Missing user id");

    // validate incoming shipping address
    const shippingAddress = shippingAddressSchema.parse(data);

    // Ensure user exists to satisfy FK constraint
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      // Attempt to sync using a fabricated minimal user object (requires email or we bail)
      // Since we only have userId here, we cannot reconstruct Auth0 profile; return descriptive error.
      throw new Error(
        "User does not exist; please refresh session so we can sync with database"
      );
    }

    // find existing address record (first one for user)
    const existing = await prisma.address.findFirst({ where: { userId } });

    if (existing) {
      await prisma.address.update({
        where: { id: existing.id },
        data: {
          shippingAddress: { ...shippingAddress, isPrimary: true },
        },
      });
    } else {
      await prisma.address.create({
        data: {
          userId,
          shippingAddress: { ...shippingAddress, isPrimary: true },
        },
      });
    }

    return { success: true, message: "Address saved" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
