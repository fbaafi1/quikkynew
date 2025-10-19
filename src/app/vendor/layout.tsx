"use client";

import { useUser } from '@/contexts/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import LogoutButton from '@/components/auth/LogoutButton';

const vendorNavItems = [
  { 
    href: '/vendor/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'View your store analytics and overview',
    showBadge: false
  },
  { 
    href: '/vendor/products', 
    label: 'Products', 
    icon: Package,
    description: 'Manage your product listings',
    showBadge: false
  },
  { 
    href: '/vendor/orders', 
    label: 'Orders', 
    icon: ClipboardList,
    description: 'View and manage customer orders',
    showBadge: false
  },
  { 
    href: '/vendor/notifications', 
    label: 'Notifications', 
    icon: Bell,
    description: 'View your notifications',
    showBadge: true
  },
  { 
    href: '/vendor/settings', 
    label: 'Settings', 
    icon: Settings,
    description: 'Configure your store settings',
    showBadge: false
  },
];

export default function VendorLayout({ children }: { children: ReactNode }) {
  const { currentUser, loadingUser } = useUser();
  const { notificationCount } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'denied' | 'granted'>('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle user authentication status
  useEffect(() => {
    if (loadingUser) return; // still loading user

    if (!currentUser || currentUser.role !== 'vendor') {
      setStatus('denied');
      router.replace('/'); // redirect only once we know for sure
    } else {
      setStatus('granted');
    }
  }, [currentUser, loadingUser, router]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Show loading state
  if (status === 'checking') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Handle denied access
  if (status === 'denied') {
    return null; // nothing, since redirect is already triggered
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-primary text-white p-3 rounded-full shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link 
              href="/vendor/dashboard" 
              className="text-xl font-bold text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Vendor Portal
            </Link>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-gray-500 hover:text-gray-700"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {vendorNavItems.map(({ href, label, icon: Icon, showBadge }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors group",
                      pathname === href
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {showBadge && notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                          {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                      )}
                    </div>
                    <span className="ml-3">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="mb-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
              </div>
            </div>
            <LogoutButton className="w-full" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

