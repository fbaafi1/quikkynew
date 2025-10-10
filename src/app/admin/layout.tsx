"use client";

import { useUser } from "@/contexts/UserContext";
import { ReactNode, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Tags,
  Store,
  Megaphone,
  Rss,
  Sparkles,
  Settings,
  MessageSquare,
  Zap,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useRouter } from "next/navigation";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/flash-sales", label: "Flash Sales", icon: Zap },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/advertisements", label: "Advertisements", icon: Megaphone },
  { href: "/admin/blog", label: "Blog Management", icon: Rss },
  { href: "/admin/boost-requests", label: "Boost Requests", icon: Sparkles },
  { href: "/admin/boost-settings", label: "Boost Settings", icon: Settings },
  { href: "/admin/notifications", label: "Send Notification", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loadingUser) return;

    if (!currentUser) {
      // User is not logged in → redirect
      router.replace("/");
    } else if (currentUser.role !== "admin") {
      // User logged in but not admin
      router.replace("/");
    } else {
      // User is verified admin
      setChecked(true);
    }
  }, [currentUser, loadingUser, router]);

  if (loadingUser || !checked) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Button
            variant="ghost"
            asChild
            className="w-full justify-start h-auto p-2"
          >
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">QuiKart</span>
            </Link>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild className="w-full justify-start">
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="md:hidden mb-4">
            <SidebarTrigger />
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

