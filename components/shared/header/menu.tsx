import { EllipsisVertical, ShoppingCart, UserIcon } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { syncUserWithDatabase, getUserFromPrisma } from "@/lib/user-service";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";
import ModeToggle from "./module-toggle";
import { getAuth0UserMetadata } from "@/lib/auth0-management";

// Use Stripe for payments

const Menu = async () => {
  const session = await auth0.getSession();
  const user = session?.user;

  // fetch metadata if we have a user
  let userMetadata = null;
  let isAdmin = false;
  let dbUser = null;

  if (user?.sub) {
    userMetadata = await getAuth0UserMetadata(user.sub);

    // Check if user is admin from the Prisma database
    if (userMetadata?.user_metadata?.user_id) {
      dbUser = await getUserFromPrisma(userMetadata.user_metadata.user_id);
      isAdmin = dbUser?.role === "admin";
    }
  }

  // if user is authenticated, sync with database
  if (user) {
    try {
      if (!userMetadata?.user_metadata?.user_id) {
        // If no user ID in metadata, sync with database
        await syncUserWithDatabase(user);
      }
    } catch (error) {
      console.error("Error syncing user with database:", error);
    }
  }

  const renderLink = () => {
    if (!session) {
      return (
        <>
          <Button asChild variant="outline" className="mr-2">
            <Link href="/auth/login?screen_hint=signup">Sign up</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login">Log in</Link>
          </Button>
        </>
      );
    }

    return (
      <>
        {isAdmin && (
          <Button asChild variant="outline" className="mr-2">
            <Link href="/manage">
              <UserIcon className="mr-2 h-4 w-4" />
              Manage users
            </Link>
          </Button>
        )}
        <>
          <Button asChild variant="outline" className="mr-2">
            <Link href={dbUser?.blocked ? "/blocked" : "/profile"}>
              <UserIcon className="mr-2 h-4 w-4" />
              My Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/auth/logout">Log out</Link>
          </Button>
        </>
      </>
    );
  };

  return (
    <>
      <div className="flex justify-end gap-3">
        <nav className="md:flex hidden w-full max-w-xs gap-1">
          <ModeToggle />
          <Button asChild variant="ghost">
            <Link href={dbUser?.blocked ? "/blocked" : "/cart"}>
              <ShoppingCart />
              Cart
            </Link>
          </Button>
          {renderLink()}
        </nav>
        <nav className="md:hidden">
          <Sheet>
            <SheetTrigger className="align-middle">
              <EllipsisVertical />
            </SheetTrigger>
            <SheetContent className="flex flex-col items-start">
              <SheetTitle>Menu</SheetTitle>
              <ModeToggle />
              <Button asChild variant="ghost">
                <Link href="/cart">
                  <ShoppingCart />
                  Cart
                </Link>
              </Button>
              {renderLink()}
              <SheetDescription></SheetDescription>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </>
  );
};

export default Menu;
