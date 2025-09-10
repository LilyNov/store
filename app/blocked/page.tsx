"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Ban } from "lucide-react";
import { useEffect } from "react";

export default function BlockedPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("user")) {
      localStorage.removeItem("user");
    }
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
        <Ban className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-700 mb-6 text-center">
          Your account has been blocked by an administrator. Log out please
        </p>
        <Button asChild variant="outline">
          <Link href="/">Go to Home</Link>
        </Button>
        <Button asChild variant="outline" className="mr-2">
          <Link href="/auth/logout">Log out</Link>
        </Button>
      </div>
    </div>
  );
}
