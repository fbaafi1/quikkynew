
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, ShoppingCart, Trash2, XCircle, ImageIcon, Store } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { CartItem } from '@/lib/types';

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/64x64.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`; 
  let hint: string = itemName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc;
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/64x64.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }
  
  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};

// Group cart items by vendor
const groupItemsByVendor = (cartItems: CartItem[]) => {
  return cartItems.reduce((acc, item) => {
    const vendorId = item.vendor_id || 'quikart_direct';
    const storeName = item.vendors?.store_name || 'QuiKart Direct';
    
    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendorId: item.vendor_id,
        storeName: storeName,
        items: [],
      };
    }
    acc[vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendorId?: string | null; storeName: string; items: CartItem[] }>);
};


export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount, isLoadingCart } = useCart();
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loadingUser && !currentUser && isClient) {
      router.push('/auth/login?redirect=/cart');
    }
  }, [currentUser, loadingUser, router, isClient]);

  const groupedItems = useMemo(() => groupItemsByVendor(cartItems), [cartItems]);
  const vendorGroups = Object.values(groupedItems);


  if (!isClient || loadingUser || isLoadingCart) {
    return (
      <div className="text-center py-20">
        <Spinner className="mx-auto h-12 w-12 text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Loading cart...</p>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="text-center py-20">
        <Spinner className="mx-auto h-12 w-12 text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Redirecting to login...</p>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-semibold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild size="lg">
          <Link href="/">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
       <h1 className="text-3xl font-bold mb-6">Your Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              {vendorGroups.map(({ vendorId, storeName, items }) => (
                  <Card key={vendorId || 'quikart'} className="shadow-md">
                     <CardHeader className="p-4 border-b">
                          <CardTitle className="text-lg flex items-center gap-2">
                              <Store size={20} className="text-muted-foreground"/>
                              <span className="text-muted-foreground">Sold by:</span>
                              {vendorId ? (
                                  <Link href={`/vendors/${vendorId}`} className="text-primary hover:underline">{storeName}</Link>
                              ) : (
                                  <span>{storeName}</span>
                              )}
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {items.map(item => {
                              const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
                              return (
                                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                                  <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    {itemImageUrl ? (
                                      <Image src={itemImageUrl} alt={item.name} fill sizes="96px" className="object-cover" data-ai-hint={itemImageHint}/>
                                    ) : (
                                      <ImageIcon className="w-12 h-12 text-muted-foreground m-auto" />
                                    )}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <Link href={`/products/${item.id}`} className="hover:text-primary"><h3 className="text-base font-semibold truncate">{item.name}</h3></Link>
                                    <p className="text-sm text-muted-foreground">Unit Price: GH₵{item.price.toFixed(2)}</p>
                                    {typeof item.stock === 'number' && <p className="text-xs text-muted-foreground">Stock: {item.stock}</p>}
                                  </div>
                                  <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                                    <div className="flex items-center justify-between sm:justify-end gap-2">
                                      <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity"><MinusCircle className="h-4 w-4" /></Button>
                                        <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)} className="w-16 h-8 text-center" min="1"/>
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity"><PlusCircle className="h-4 w-4" /></Button>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)} aria-label="Remove item"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                    <p className="text-md font-semibold text-primary text-right">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                                  </div>
                                </div>
                              );
                          })}
                        </div>
                      </CardContent>
                  </Card>
              ))}
            </div>

            <div className="lg:col-span-1 sticky top-24">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal ({itemCount} items)</span>
                            <span>GH₵{cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Shipping</span>
                            <span>Calculated at checkout</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-xl font-bold">
                            <span>Order Total</span>
                            <span className="text-primary">GH₵{cartTotal.toFixed(2)}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button size="lg" asChild className="w-full">
                            <Link href="/checkout">Proceed to Checkout</Link>
                        </Button>
                         <Button variant="outline" onClick={clearCart} className="w-full">
                            <XCircle className="mr-2 h-4 w-4" /> Clear Cart
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </div>
  );
}
