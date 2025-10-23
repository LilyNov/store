import { prisma } from "@/db/prisma";
import { updateAuth0UserMetadata } from "./auth0-management";
import { User } from "@auth0/nextjs-auth0/types";

/**
 * Synchronizes the Auth0 user with our database
 * If the user doesn't exist, creates them
 * If they do exist, updates their last login timestamp
 * Returns the user's database ID
 */

export async function syncUserWithDatabase(auth0User: User): Promise<string> {
  if (!auth0User.email) {
    throw new Error("User email is required");
  }
  console.log(auth0User);
  // get the JWT from Auth0 and get the user id from metadata (In JWT)
  // Upsert the user in our database
  const user = await prisma.user.upsert({
    where: {
      email: auth0User.email,
    },
    update: {
      updatedAt: new Date(),
    },
    create: {
      email: auth0User.email,
      name: auth0User.name || auth0User.email.split("@")[0],
      image: auth0User.picture || null,
    },
  });

  // If the Auth0 user doesn't have our DB user ID in metadata, update it
  try {
    if (!auth0User.app_metadata?.user_id) {
      await updateAuth0UserMetadata(auth0User.sub as string, {
        user_id: user.id,
      });
    }
  } catch (err) {
    console.warn("Non-critical error: Failed to update Auth0 metadata", err);
  }

  return user.id;
}

/**
 * Retrieves a user from the Prisma database by ID
 */
export async function getUserFromPrisma(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    return user;
  } catch (error) {
    console.error("Error retrieving user from database:", error);
    return null;
  }
}

export async function getUserAddress(userId: string) {
  try {
    return await prisma.address.findFirst({ where: { userId } });
  } catch (error) {
    console.error("Error retrieving user address:", error);
    return null;
  }
}
