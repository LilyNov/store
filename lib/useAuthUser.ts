import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";

interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  address?: string | null;
  paymentMethod?: string;
}

export function useAuthUser() {
  const { user: auth0User, error, isLoading } = useUser();
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (auth0User && !syncing) {
      syncUserToDatabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth0User]);

  const syncUserToDatabase = async () => {
    if (!auth0User) return;

    setSyncing(true);
    try {
      const response = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth0Id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name,
          image: auth0User.picture,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData.user);
      }
    } catch (error) {
      console.error("Failed to sync user:", error);
    } finally {
      setSyncing(false);
    }
  };

  return {
    auth0User,
    dbUser,
    isLoading: isLoading || syncing,
    error,
  };
}
