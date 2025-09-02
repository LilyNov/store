import { ManagementClient } from "auth0";

// Create an Auth0 Management API client
const managementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN || "",
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || "",
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || "",
});

/**
 * Updates Auth0 user metadata
 * @param userId Auth0 user ID (sub)
 * @param metadata Metadata to update
 */
export async function updateAuth0UserMetadata(
  auth0UserId: string,
  userId: Record<string, unknown>
) {
  console.log(
    "Updating Auth0 user metadata for user ID:",
    auth0UserId,
    "with data:",
    userId
  );
  console.log("Management client:", managementClient);

  try {
    await managementClient.users.update(
      { id: auth0UserId }, // Request parameter - which user to update
      { user_metadata: userId } // Body parameter - what to update
    );
    return true;
  } catch (error) {
    console.error("Error updating Auth0 user metadata:", error);
    return false;
  }
}

/**
 * Retrieves Auth0 user metadata for a specific user
 * @param auth0UserId Auth0 user ID (sub)
 * @returns User metadata object or null if error occurs
 */
export async function getAuth0UserMetadata(auth0UserId: string) {
  console.log("Fetching Auth0 user metadata for user ID:", auth0UserId);

  try {
    const user = await managementClient.users.get({ id: auth0UserId });

    return {
      user_metadata: user.data.user_metadata || {},
      app_metadata: user.data.app_metadata || {},
    };
  } catch (error) {
    console.error("Error fetching Auth0 user metadata:", error);
    return null;
  }
}
