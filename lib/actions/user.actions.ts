"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

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
