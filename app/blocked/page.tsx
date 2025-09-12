"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Ban } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function BlockedPage() {
  const [count, setCount] = useState(5);
  const [isModalHovered, setIsModalHovered] = useState(false);
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Log out user
    localStorage.removeItem("user");
    // Countdown logic
    if (!isModalHovered && count > 1) {
      intervalRef.current = setInterval(() => {
        setCount((prev) => (prev > 1 ? prev - 1 : prev));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // Only rerun when isModalHovered or count changes
  }, [isModalHovered, count, router]);

  useEffect(() => {
    if (count === 1 && !isModalHovered) {
      router.push("/auth/logout");
    }
  }, [count, isModalHovered, router]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-red-50"
      // When mouse leaves background, resume countdown
      onMouseMove={(e) => {
        // If mouse is NOT over modal, resume countdown
        if (!e.target || !(e.target as HTMLElement).closest(".blocked-modal")) {
          setIsModalHovered(false);
        }
      }}
    >
      <div
        className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center blocked-modal"
        onMouseEnter={() => setIsModalHovered(true)}
        onMouseLeave={() => setIsModalHovered(false)}
      >
        <Ban className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-700 mb-6 text-center">
          Your account has been blocked by an administrator.
          <br />
          You will be redirected to the home page in <span>{count}</span>{" "}
          seconds
        </p>
        <Button asChild variant="outline">
          <Link href="/auth/logout">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
