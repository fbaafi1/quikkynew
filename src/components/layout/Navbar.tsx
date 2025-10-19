import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, User as UserIcon, UserCircle, LayoutDashboard, Heart, Menu, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useCart } from '@/contexts/CartContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalSearch } from './GlobalSearch';
import CategoryNavigation from './CategoryNavigation';
import LogoutButton from '../auth/LogoutButton';

export default function Navbar() {
  const { currentUser, loadingUser } = useUser();
  const { itemCount: cartItemCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'QK';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Mobile Menu Button and Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden flex items-center justify-center h-10 w-10 -ml-2 hover:bg-primary/90"
                aria-label="Toggle menu"
              >
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0" onInteractOutside={() => setIsMobileMenuOpen(false)}>
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-[calc(100vh-65px)] pb-4">
                <CategoryNavigation isMobile={true} />
                
                {/* Mobile-only navigation items */}
                <div className="px-4 pt-4 border-t mt-4">
                  {!currentUser && !loadingUser && (
                    <Button asChild variant="outline" className="w-full mb-3">
                      <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <UserCircle className="mr-2 h-4 w-4" /> Login
                      </Link>
                    </Button>
                  )}
                  <Button asChild className="w-full bg-white text-primary hover:bg-gray-50">
                    <Link href="/sell-on-quikart" onClick={() => setIsMobileMenuOpen(false)}>
                      <span className="text-xl mr-1">+</span> SELL
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Link
            href="/"
            className="flex items-center gap-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground/50 rounded-sm"
            onClick={(e) => {
              // Only close mobile menu if it's open, don't prevent default navigation
              if (isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
              }
              // Let Next.js handle the navigation normally
            }}
          >
            <span className="text-xl sm:text-2xl font-bold whitespace-nowrap">QuiKart</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 max-w-3xl items-center gap-4 mx-4">
          <div className="w-full max-w-xl">
            <GlobalSearch />
          </div>
          <CategoryNavigation />
        </div>

        {/* Desktop Actions */}
        <nav className="flex items-center gap-2 sm:gap-3 justify-end">
          {/* Sell Button - Visible on all screens */}
          <div>
            <Button 
              asChild 
              variant="outline" 
              className="bg-white text-primary hover:bg-gray-100 border-white hover:border-gray-100 font-medium gap-1 px-2 h-8 text-sm whitespace-nowrap"
            >
              <Link href="/sell-on-quikart" className="flex items-center">
                <span className="text-lg leading-none">+</span>
                <span className="text-sm">SELL</span>
              </Link>
            </Button>
          </div>

          {/* Cart Button */}
          <Button 
            variant="ghost" 
            asChild 
            title="Cart" 
            size="icon" 
            className="relative h-9 w-9 sm:h-10 sm:w-10 hover:bg-primary/90"
          >
            <Link href="/cart" className="flex items-center justify-center">
              <ShoppingCart size={20} />
              {cartItemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground"
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
          
          {/* User Menu */}
          {loadingUser && !currentUser ? (
            <div className="flex items-center">
              <Skeleton className="h-9 w-20 rounded-md bg-white/20" />
            </div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-primary/90"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 border-2 border-primary-foreground/50">
                    <AvatarImage 
                      src={`https://placehold.co/40x40.png?text=${getInitials(currentUser.name)}`} 
                      alt={currentUser.name || "User"} 
                    />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="w-full">
                      <LayoutDashboard className="mr-2 h-4 w-4"/>
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {currentUser.role === 'vendor' && (
                  <DropdownMenuItem asChild>
                    <Link href="/vendor/dashboard" className="w-full">
                      <LayoutDashboard className="mr-2 h-4 w-4"/>
                      Vendor Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="w-full">
                    <UserIcon className="mr-2 h-4 w-4"/> 
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="w-full">
                    <Package className="mr-2 h-4 w-4"/> 
                    My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlist" className="w-full">
                    <Heart className="mr-2 h-4 w-4"/> 
                    Wishlist
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="w-full px-2 py-1.5">
                  <LogoutButton />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              asChild 
              className="h-9 px-3 hover:bg-primary/90 focus:bg-transparent active:bg-transparent"
            >
              <Link 
                href="/auth/login" 
                className="flex items-center gap-1 focus:outline-none focus:ring-0"
              >
                <UserCircle size={16} className="sm:mr-1" />
                <span className="hidden xs:inline">Login</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
      {/* Mobile Search Bar - displayed under header */}
      <div className="md:hidden p-2 border-t border-primary/10 bg-background">
        <div className="container">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
}
