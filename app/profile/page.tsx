import { auth0 } from "@/lib/auth0";
import { getUserFromPrisma } from "@/lib/user-service";
import { decodeJwt } from "@/lib/jwt-utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserIcon } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth0.getSession();
  const user = session?.user;

  // !!! decoded token with user metadata
  const idToken = session?.tokenSet?.idToken;
  const decodedToken = idToken ? decodeJwt(idToken) : null;

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">
          Please log in to view your profile
        </h1>
        <Button asChild>
          <Link href="/auth/login">Log in</Link>
        </Button>
      </div>
    );
  }

  // get user metadata and database user
  let dbUser = null;

  //  if we have a user_id in metadata, fetch the user from database

  if (decodedToken.user_id) {
    dbUser = await getUserFromPrisma(decodedToken.user_id);
    console.log("Prisma dbUser found:", decodedToken.user_id);
  } else {
    dbUser = user;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            {dbUser?.image ? (
              <AvatarImage src={dbUser.image} alt={dbUser.name || "User"} />
            ) : user?.picture ? (
              <AvatarImage src={user.picture} alt={user.name || "User"} />
            ) : (
              <AvatarFallback>
                {user?.name ? getInitials(user.name) : <UserIcon />}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-2xl">
              {dbUser?.name || user?.name}
            </CardTitle>
            <CardDescription>{dbUser?.email || user?.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-lg">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{dbUser?.email || user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email Verified</p>
                <p>{user?.email_verified ? "Yes" : "No"}</p>
              </div>
              {dbUser && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Database ID</p>
                    <p className="truncate">{dbUser.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Member Since
                    </p>
                    <p>
                      {dbUser.createdAt
                        ? new Date(dbUser.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {decodedToken && (
            <div>
              <h3 className="font-medium text-lg">Token Information</h3>
              <div className="mt-2 space-y-2">
                {Object.entries(decodedToken)
                  .filter(([key]) => !["iat", "exp", "aud"].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm break-words">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </p>
                    </div>
                  ))}
                {decodedToken.exp && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p>{new Date(decodedToken.exp * 1000).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
