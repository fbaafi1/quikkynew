"use client";

import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
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
  SidebarTrigger
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  Bell
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import LogoutButton from '@/components/auth/LogoutButton';

const vendorNavItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/products', label: 'Products', icon: Package },
  { href: '/vendor/orders', label: 'Orders', icon: ClipboardList },
  { href: '/vendor/notifications', label: 'Notifications', icon: Bell },
  { href: '/vendor/settings', label: 'Store Settings', icon: Settings },
];

export default function VendorLayout({ children }: { children: ReactNode }) {
  const { currentUser, loadingUser } = useUser();
  const { notificationCount } = useNotifications();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'denied' | 'granted'>('checking');

  useEffect(() => {
    if (loadingUser) return; // still loading user

    if (!currentUser || currentUser.role !== 'vendor') {
      setStatus('denied');
      router.replace('/'); // redirect only once we know for sure
    } else {
      setStatus('granted');
    }
  }, [currentUser, loadingUser, router]);

  if (status === 'checking') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (status === 'denied') {
    return null; // nothing, since redirect is already triggered
  }

  // ✅ Only gets here if vendor access is granted
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Button variant="ghost" asChild className="w-full justify-start h-auto p-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">QuiKart</span>
            </Link>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {vendorNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild className="w-full justify-start relative">
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.href === '/vendor/notifications' && notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </Badge>
                    )}
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

