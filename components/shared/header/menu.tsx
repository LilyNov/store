import { EllipsisVertical, ShoppingCart, UserIcon } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { syncUserWithDatabase } from "@/lib/user-service";

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

const Menu = async () => {
  const session = await auth0.getSession();
  const user = session?.user;
  console.log("User session:", user);

  // If user is authenticated, sync with our database
  // The user sync happens automatically when the Menu component loads for an authenticated user

  if (user) {
    try {
      if (!user.email) {
        throw new Error("User email is required");
      }
      const userId = await syncUserWithDatabase(user);
      console.log("User synced with database, ID:", userId);
    } catch (error) {
      console.error("Error syncing user with database:", error);
    }
  }

  const renderLink = () => {
    if (!session) {
      return (
        <>
          <Link href="/auth/login?screen_hint=signup">Sign up</Link>
          <Link href="/auth/login">Log in</Link>
        </>
      );
    }
    return (
      <Link href="/auth/logout">
        <UserIcon />
        Log out
      </Link>
    );
  };
  return (
    <>
      <div className="flex justify-end gap-3">
        <nav className="md:flex hidden w-full max-w-xs gap-1">
          <ModeToggle />
          <Button asChild variant="ghost">
            <Link href="/cart">
              <ShoppingCart />
              Cart
            </Link>
          </Button>
          <Button asChild>{renderLink()}</Button>
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
              <Button asChild>
                <Link href="/sign-in">
                  <UserIcon />
                  Sign In
                </Link>
              </Button>
              <SheetDescription></SheetDescription>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </>
  );
};

export default Menu;
