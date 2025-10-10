"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle } from "lucide-react";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  allowedRole?: 'admin' | 'vendor'; // Make role optional for general protection
  redirectPath?: string; // Allow custom redirect path
}

export default function ProtectedLayout({ children, allowedRole, redirectPath = '/auth/login' }: ProtectedLayoutProps) {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loadingUser) {
      return; // Wait for the session to be loaded
    }

    if (!currentUser) {
      // If no user, redirect to login
      const destination = `${redirectPath}?redirect=${window.location.pathname}`;
      router.replace(destination);
      return;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
      // If role is required and doesn't match, redirect to a safe page (e.g., home)
      router.replace('/');
    }

  }, [loadingUser, currentUser, allowedRole, router, redirectPath]);

  if (loadingUser) {
    return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground mt-4">Verifying access...</p>
        </div>
    );
  }
  
  if (!currentUser || (allowedRole && currentUser.role !== allowedRole)) {
    // While redirecting, show a message or a spinner
    return (
       <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
         <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
         <h1 className="text-xl font-semibold">Access Denied</h1>
         <p className="text-muted-foreground mt-2">You do not have permission to view this page. Redirecting...</p>
       </div>
    );
  }
  
  // If not loading and user is valid, render the children
  return <>{children}</>;
}
