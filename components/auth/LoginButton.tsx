"use client";
import { useAuthUser } from "@/lib/useAuthUser";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginButton() {
  const { auth0User, isLoading, error } = useAuthUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (auth0User) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            {auth0User.picture ? (
              <Image
                src={auth0User.picture || "/default-profile.png"}
                alt={auth0User.name || "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
            <span className="hidden md:inline">{auth0User.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Settings className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/api/auth/logout" className="flex items-center w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button asChild>
      <Link href="/api/auth/login">Login</Link>
    </Button>
  );
}
