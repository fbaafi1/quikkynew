"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallback() {
  const router = useRouter();
  const { session, loadingUser, currentUser } = useUser();

  useEffect(() => {
    // 1. Don't redirect until user/session are fully loaded
    if (loadingUser) return;

    // 2. If no session, send back to login
    if (!session) {
      router.replace("/auth/login");
      return;
    }

    // 3. If user exists, redirect based on role
    if (currentUser?.role) {
      if (currentUser.role === "admin") {
        router.replace("/admin");
      } else if (currentUser.role === "vendor") {
        router.replace("/vendor/dashboard");
      } else {
        router.replace("/"); // customer or fallback
      }
    }
    // Note: if session exists but currentUser is still null, spinner stays

  }, [session, loadingUser, currentUser, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <Spinner className="h-12 w-12 text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">
          Finalizing sign-in, please wait...
        </p>
      </div>
    </div>
  );
}
