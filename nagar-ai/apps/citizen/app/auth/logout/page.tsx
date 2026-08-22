"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/lib/auth";
import { log } from "@/lib/logger";

export default function LogoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    signOut().then(() => {
      log("info", "logout success");
      setDone(true);
      router.push("/auth/login");
    });
  }, [router]);

  return (
    <main className="mx-auto max-w-md p-6 text-center text-gray-600">
      {done ? "Redirecting..." : "Logging out..."}
    </main>
  );
}
