import { prisma } from "@/db/prisma";
import { updateAuth0UserMetadata } from "./auth0-management";
import { User } from "@auth0/nextjs-auth0/types";
import { auth0 } from "@/lib/auth0";
import { decodeJwt } from "@/lib/jwt-utils";

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

/**
 * Lightweight helper for server routes/actions to resolve the DB user id.
 * - Returns null if unauthenticated.
 * - Attempts to use custom claim (decoded token user_id) first.
 * - Falls back to syncing user if no claim present.
 */
export async function resolveUserId(): Promise<string | null> {
  const session = await auth0.getSession();
  const sessionUser = session?.user;
  if (!sessionUser) return null;
  try {
    const idToken = session?.tokenSet?.idToken;
    const decoded = idToken ? decodeJwt(idToken) : null;
    const claimId = decoded?.user_id as string | undefined;
    if (claimId) {
      const existing = await getUserFromPrisma(claimId);
      if (existing) return claimId;
      return await syncUserWithDatabase(sessionUser as User);
    }
    // No claim, sync now
    return await syncUserWithDatabase(sessionUser as User);
  } catch (err) {
    console.warn("resolveUserId: failed to resolve user id", err);
    return null;
  }
}

/**
 * Variant helper when caller already has Auth0 session object.
 */
// Minimal session shape (avoid strict dependency on library types)
interface Auth0SessionShape {
  user?: User;
  tokenSet?: { idToken?: string };
}
export async function resolveUserIdFromSession(
  session: Auth0SessionShape | null | undefined
): Promise<string | null> {
  const sessionUser = session?.user;
  if (!sessionUser) return null;
  try {
    const idToken = session?.tokenSet?.idToken;
    const decoded = idToken ? decodeJwt(idToken) : null;
    const claimId = decoded?.user_id as string | undefined;
    if (claimId) {
      const existing = await getUserFromPrisma(claimId);
      if (existing) return claimId;
      return await syncUserWithDatabase(sessionUser as User);
    }
    return await syncUserWithDatabase(sessionUser as User);
  } catch (err) {
    console.warn("resolveUserIdFromSession: failed", err);
    return null;
  }
}
