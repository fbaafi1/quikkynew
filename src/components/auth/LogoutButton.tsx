"use client";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const { logout } = useUser();
  return (
    <Button variant="ghost" className="w-full justify-start" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
    </Button>
  );
}
