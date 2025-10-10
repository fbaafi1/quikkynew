
"use client";

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus, OrderProductItem, Address as DeliveryAddress, PaymentMethod } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle, ImageIcon, Package, UserCircle, MapPin, CreditCard, CalendarDays, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { generateInvoicePdf } from '@/lib/invoiceGenerator';

// Reusable getImageAttributes helper
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

// Reusable getStatusBadgeVariant helper
const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending': return "default";
      case 'Processing': return "default";
      case 'Shipped': return "secondary";
      case 'Delivered': return "default";
      case 'Cancelled':
      case 'Payment Failed': return "destructive";
      default: return "outline";
    }
};

interface PageParams {
  orderId: string;
}

interface OrderDetailPageProps {
  params: PageParams;
}

// Data fetching function for the server component
async function getOrderDetails(orderId: string, userId: string) {
    let query = supabase
        .from('orders')
        .select(`
            *,
            order_items (
            product_id,
            quantity,
            price_at_purchase,
            product_name,
            product_image,
            products (id, name, description, price, images, category_id, stock, vendors (id, store_name))
            ),
            user_profiles (name, email, phone)
        `)
        .eq('id', orderId);

    // Security check: RLS policy on Supabase should enforce this, but an explicit check here doesn't hurt.
    query = query.eq('user_id', userId);

    const { data: ordersData, error: supabaseError } = await query.single();
    
    if (supabaseError) {
        if (supabaseError.code === 'PGRST116') { // No rows found
            return null;
        }
        throw new Error(`Failed to fetch order: ${supabaseError.message}`);
    }

    if (ordersData) {
        const data = ordersData;
        const formattedOrder: Order = {
        id: data.id,
        userId: data.user_id,
        items: data.order_items?.map((oi: any) => ({
            id: oi.products?.id || oi.product_id,
            name: oi.product_name || oi.products?.name || 'Unknown Product',
            description: oi.products?.description,
            price: oi.price_at_purchase,
            images: oi.product_image ? [oi.product_image] : (oi.products?.images || []),
            categoryId: oi.products?.category_id,
            quantity: oi.quantity,
            vendorName: oi.products?.vendors?.store_name || 'QuiKart',
            vendorId: oi.products?.vendors?.id,
        })) as OrderProductItem[] || [],
        totalAmount: data.total_amount,
        status: data.status as OrderStatus,
        orderDate: data.order_date,
        shippingAddress: data.shipping_address as DeliveryAddress,
        paymentMethod: data.payment_method as PaymentMethod,
        transactionId: data.transaction_id,
        user_profiles: data.user_profiles as Order['user_profiles'],
        order_items: data.order_items,
        };
        return formattedOrder;
    }
    return null;
}


// The main component remains a client component to use hooks like useUser
function CustomerOrderDetailPageContent({ order: initialOrder, orderId }: { order: Order | null, orderId: string }) {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();

  if (loadingUser) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading order details...</p>
        </div>
    );
  }

  if (!currentUser) {
      router.push(`/auth/login?redirect=/orders/${orderId}`);
      return null;
  }
  
  if (!initialOrder) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Order Not Found</h1>
        <p className="text-muted-foreground mt-2">The order you are looking for does not exist or you do not have permission to view it.</p>
         <Button asChild className="mt-4 text-muted-foreground hover:text-foreground h-8 px-3 text-xs" variant="ghost" size="sm">
            <Link href="/orders"><ChevronLeft className="mr-1 h-3 w-3" /> Back to My Orders</Link>
        </Button>
      </div>
    );
  }

  const order = initialOrder;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
                <Link href={currentUser?.role === 'vendor' ? '/vendor/orders' : '/orders'}><ChevronLeft className="mr-1 h-3 w-3" /> Back to Orders</Link>
            </Button>
            {currentUser?.role === 'vendor' && (
              <Button onClick={() => generateInvoicePdf(order, currentUser)}>
                  <Download className="mr-2 h-4 w-4" /> Download Invoice
              </Button>
            )}
        </div>

        <Card className="shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="text-2xl">Order ID: {order.id}</CardTitle>
                    <CardDescription className="flex items-center gap-1"><CalendarDays size={14}/> {format(new Date(order.orderDate), "PPP p")}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)} className="text-base px-3 py-1">{order.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><MapPin size={20}/> Delivery Address</h3>
                    <div className="text-sm space-y-1 pl-2 border-l-2">
                        <p><strong>Customer:</strong> {order.user_profiles?.name || 'N/A'}</p>
                        <p><strong>Phone:</strong> {order.user_profiles?.phone || 'N/A'}</p>
                        <p><strong>Street:</strong> {order.shippingAddress.street}</p>
                        <p><strong>City:</strong> {order.shippingAddress.city}</p>
                        <p><strong>Region:</strong> {order.shippingAddress.region}</p>
                        {order.shippingAddress.postalCode && <p><strong>Postal Code:</strong> {order.shippingAddress.postalCode}</p>}
                        <p><strong>Country:</strong> {order.shippingAddress.country}</p>
                    </div>
                </section>
                <Separator/>
                 <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CreditCard size={20}/> Payment Details</h3>
                    <div className="text-sm space-y-1 pl-2 border-l-2">
                        <p><strong>Method:</strong> {order.paymentMethod}</p>
                        {order.transactionId && <p><strong>Transaction ID:</strong> {order.transactionId}</p>}
                        <p><strong>Total Amount:</strong> <span className="font-bold text-primary">GH₵{order.totalAmount.toFixed(2)}</span></p>
                    </div>
                </section>
                <Separator/>
                <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Package size={20}/> Order Items ({order.items.length})</h3>
                    <div className="space-y-3">
                        {order.items.map((item, index) => {
                            const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
                            return (
                                <div key={`${item.id}-${index}`} className="flex items-center gap-4 p-2 border rounded-md">
                                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                        {itemImageUrl ? (
                                        <Image src={itemImageUrl} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={itemImageHint} />
                                        ) : <ImageIcon className="w-8 h-8 text-muted-foreground m-auto" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} x GH₵{item.price.toFixed(2)}</p>
                                    </div>
                                    <p className="text-sm font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}

// The main export is now a Server Component that fetches data and passes it to the client component.
export default async function CustomerOrderDetailServerPage({ params }: OrderDetailPageProps) {
    const { orderId } = params;

    // To ensure security, we need the current user's ID. We can't use hooks here.
    // Let's assume you have a helper function to get the current user session on the server.
    // If not, you would need to create one using `createServerComponentClient`.
    // For now, we'll pass the fetching logic to the client component to re-use the existing user context.
    // This is a hybrid approach. The data is fetched on the client but only after the user session is confirmed.
    // A full server component approach would require a server-side session helper.

    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Spinner className="h-12 w-12 text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading order...</p>
            </div>
        }>
            <CustomerOrderDetailPageContentLoader orderId={orderId} />
        </Suspense>
    );
}

// This new component will be the one doing client-side data fetching
// but it is called from the server component wrapper.
async function CustomerOrderDetailPageContentLoader({ orderId }: { orderId: string }) {
    const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs');
    const { cookies } = await import('next/headers');
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    
    let orderData = null;
    if (session?.user?.id) {
        orderData = await getOrderDetails(orderId, session.user.id);
    }

    return <CustomerOrderDetailPageContent order={orderData} orderId={orderId} />
}
