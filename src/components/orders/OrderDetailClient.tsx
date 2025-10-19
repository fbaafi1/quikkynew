"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus, OrderProductItem, Address as DeliveryAddress, PaymentMethod } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, AlertTriangle, ImageIcon, Package, UserCircle, MapPin, CreditCard, CalendarDays, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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

interface OrderDetailClientProps {
  order: Order | null;
  orderId: string;
}

export default function OrderDetailClient({ order: initialOrder, orderId }: OrderDetailClientProps) {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const { toast } = useToast();

  if (loadingUser) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  const handleDownloadInvoice = async () => {
    if (isGeneratingInvoice) return;

    setIsGeneratingInvoice(true);
    try {
      await generateInvoicePdf(order, currentUser);
      toast({
        title: "Invoice Generated",
        description: "The invoice PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast({
        title: "Invoice Generation Failed",
        description: "There was an error generating the invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
                <Link href={currentUser?.role === 'vendor' ? '/vendor/orders' : '/orders'}><ChevronLeft className="mr-1 h-3 w-3" /> Back to Orders</Link>
            </Button>
            {currentUser?.role === 'vendor' && (
              <Button
                onClick={handleDownloadInvoice}
                disabled={isGeneratingInvoice}
              >
                <Download className="mr-2 h-4 w-4" />
                {isGeneratingInvoice ? 'Generating...' : 'Download Invoice'}
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
