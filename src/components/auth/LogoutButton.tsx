"use client";
import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  className?: string;
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
  onLogoutError?: (error: Error) => void;
}

export default function LogoutButton({ 
  className, 
  onLogoutStart,
  onLogoutComplete,
  onLogoutError,
  ...props 
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useUser();

  const handleLogout = async () => {
    try {
      console.log('Logout process started...');
      setIsLoading(true);
      onLogoutStart?.();
      console.log('Calling logout function...');
      await logout();
      console.log('Logout successful, user signed out');
      onLogoutComplete?.();
    } catch (error) {
      console.error('Logout failed:', error);
      onLogoutError?.(error instanceof Error ? error : new Error('Logout failed'));
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      className={cn("w-full justify-start", className)}
      onClick={handleLogout}
      disabled={isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </>
      )}
    </Button>
  );
}
