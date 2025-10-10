
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/contexts/UserContext';
import PaymentSimulator from '@/components/checkout/PaymentSimulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus, PaymentMethod, Address, CartItem, FlashSale } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ImageIcon, MapPinIcon, PhoneIcon, Save, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendOrderConfirmationNotifications } from '@/ai/flows/order-notifications-flow';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

const getDiscountedPrice = (price: number, sale: FlashSale) => {
    if (sale.discount_type === 'percentage') {
        return price * (1 - sale.discount_value / 100);
    }
    return Math.max(0, price - sale.discount_value);
};

const ghanaRegions = [
  'Ahafo Region', 'Ashanti Region', 'Bono East Region', 'Bono Region', 'Central Region',
  'Eastern Region', 'Greater Accra Region', 'North East Region', 'Northern Region', 'Oti Region',
  'Savannah Region', 'Upper East Region', 'Upper West Region', 'Volta Region', 'Western North Region', 'Western Region',
].sort();


export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const { currentUser, loadingUser, updateUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [activeFlashSales, setActiveFlashSales] = useState<FlashSale[]>([]);

  const [showAddressPhoneForm, setShowAddressPhoneForm] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const { toast } = useToast();

  const flashSalesMap = useMemo(() => new Map(activeFlashSales.map(fs => [fs.product_id, fs])), [activeFlashSales]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
        const sale = flashSalesMap.get(item.id);
        const price = sale ? getDiscountedPrice(item.price, sale) : item.price;
        return total + price * item.quantity;
    }, 0);
  }, [cartItems, flashSalesMap]);

  useEffect(() => {
    setIsClient(true);
    if (loadingUser) return;

    if (!currentUser) {
      router.push('/auth/login?redirect=/checkout');
    } else if (cartItems.length === 0 && currentUser) {
      router.push('/');
    } else if (currentUser) {
        const addr = currentUser.address;
        setStreet(addr?.street || '');
        setCity(addr?.city || '');
        setRegion(addr?.region || '');
        setPhone(currentUser.phone || '');
        if (!addr?.street || !addr?.city || !addr?.region || !currentUser.phone) {
            setShowAddressPhoneForm(true);
        }
    }
  }, [currentUser, cartItems.length, router, loadingUser]);

  useEffect(() => {
    const fetchFlashSales = async () => {
        if (cartItems.length === 0) return;
        const productIds = cartItems.map(item => item.id);
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('flash_sales')
            .select('*')
            .in('product_id', productIds)
            .eq('is_active', true)
            .lte('start_date', now)
            .gte('end_date', now);
        if (error) console.error("Error fetching flash sales", error);
        else setActiveFlashSales(data || []);
    };
    fetchFlashSales();
  }, [cartItems]);

  const handleProfileUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!street || !city || !region || !phone) {
        toast({ title: "Missing Information", description: "Please fill all required address and phone fields.", variant: "destructive" });
        return;
    }
    if (!/^0[235]\d{8}$/.test(phone)) {
        toast({ title: "Invalid Phone Number", description: "Please enter a valid Ghanaian phone number (e.g., 024xxxxxxx or 05xxxxxxx).", variant: "destructive" });
        return;
    }

    setIsSavingProfile(true);
    const updatedAddress: Address = { street, city, region, country: currentUser.address?.country || "Ghana", postalCode: currentUser.address?.postalCode || "" };
    const { success, error } = await updateUser({ address: updatedAddress, phone });
    setIsSavingProfile(false);
    if (success) {
      setShowAddressPhoneForm(false);
      toast({ title: "Profile Updated", description: "Your delivery details have been saved." });
    }
    else {
      toast({ title: "Update Failed", description: error || "Could not update profile.", variant: "destructive" });
    }
  };

  const handlePaymentSuccess = async (details: { paymentMethod: PaymentMethod; transactionId?: string, status: OrderStatus }) => {
    if (!currentUser || !currentUser.id || !currentUser.address || !currentUser.phone) {
        setShowAddressPhoneForm(true); 
        return;
    }
    if (cartItems.length === 0) return;

    setIsProcessingOrder(true);

    try {
        const orderToInsert = {
            user_id: currentUser.id, total_amount: cartTotal, status: details.status,
            order_date: new Date().toISOString(), shipping_address: currentUser.address,
            payment_method: details.paymentMethod, transaction_id: details.transactionId,
        };
        const { data: orderData, error: orderError } = await supabase.from('orders').insert(orderToInsert).select().single();
        if (orderError) throw orderError;
        if (!orderData) throw new Error("Failed to create order.");

        const orderId = orderData.id;
        
        const orderItemsToInsert = cartItems.map(item => {
            const sale = flashSalesMap.get(item.id);
            const price_at_purchase = sale ? getDiscountedPrice(item.price, sale) : item.price;
            return {
                order_id: orderId, product_id: item.id, quantity: item.quantity, price_at_purchase,
                product_name: item.name, product_image: (item.images && item.images.length > 0 ? item.images[0].split('" data-ai-hint="')[0] : `https://placehold.co/100x100.png?text=${item.name.substring(0,3)}`)
            };
        });

        const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
        if (orderItemsError) throw orderItemsError;
      
        if (details.status !== 'Payment Failed' && details.status !== 'Cancelled') {
            for (const item of cartItems) {
                const { data: productToUpdate, error: fetchProductError } = await supabase.from('products').select('stock').eq('id', item.id).single();
                if (fetchProductError) continue;
                if (productToUpdate) {
                    const newStock = productToUpdate.stock - item.quantity;
                    await supabase.from('products').update({ stock: Math.max(0, newStock) }).eq('id', item.id);
                }

                const sale = flashSalesMap.get(item.id);
                if (sale) {
                    const { error: saleUpdateError } = await supabase.rpc('increment_flash_sale_sales_count', { sale_id: sale.id, increment_by: item.quantity });
                    if (saleUpdateError) console.error("Failed to update flash sale count", saleUpdateError);
                }
            }
            clearCart(); 

            try {
                const phoneNumberE164 = `+233${currentUser.phone.substring(1)}`;
                await sendOrderConfirmationNotifications({ orderId, customerName: currentUser.name || 'Valued Customer', customerPhone: phoneNumberE164, totalAmount: cartTotal });
            } catch (smsError: any) {
                console.error("Failed to send order confirmation notifications:", smsError);
            }
        }
        router.push(`/orders/${orderId}`); 
    } catch (error: any) {
        console.error("Order placement error:", error);
    } finally {
        setIsProcessingOrder(false);
    }
  };
  
  if (!isClient || loadingUser || (!currentUser && !loadingUser) || (cartItems.length === 0 && currentUser && isClient)) {
    return (
      <div className="text-center py-20">
        <Spinner className="h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading checkout or redirecting...</p>
        {isClient && cartItems.length === 0 && currentUser && ( <div className="mt-4"> <p className="mb-4">Your cart is empty. Please add items to proceed.</p> <Button asChild><Link href="/">Continue Shopping</Link></Button> </div> )}
      </div>
    );
  }
  
  if (!currentUser && isClient && !loadingUser) { router.push('/auth/login?redirect=/checkout'); return null; }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        <Button variant="ghost" size="sm" asChild className="mb-0 text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
           <Link href="/cart"><ChevronLeft className="mr-1 h-3 w-3" /> Back to Cart</Link>
        </Button>

        {showAddressPhoneForm && currentUser && (
            <Card className="shadow-md">
                <CardHeader> <CardTitle>Delivery Details Required</CardTitle> <CardDescription>Please provide your delivery address and phone number to continue.</CardDescription> </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                        <div> <Label htmlFor="street">Street Address</Label> <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g., 123 QuiKart Lane" required /> </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div> <Label htmlFor="city">City / Town</Label> <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Accra" required /> </div>
                            <div> <Label htmlFor="region">Region</Label>
                                <Select onValueChange={setRegion} value={region}>
                                    <SelectTrigger id="region"><SelectValue placeholder="Select your region" /></SelectTrigger>
                                    <SelectContent> {ghanaRegions.map((r) => ( <SelectItem key={r} value={r}>{r}</SelectItem> ))} </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div> <Label htmlFor="phone">Phone Number</Label> <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /> </div>
                        <Button type="submit" className="w-full" disabled={isSavingProfile}> {isSavingProfile && <Spinner className="mr-2 h-4 w-4" />} <Save className="mr-2 h-4 w-4" /> Save and Continue </Button>
                    </form>
                </CardContent>
            </Card>
        )}

        {!showAddressPhoneForm && currentUser && (
            <PaymentSimulator onPaymentSuccess={handlePaymentSuccess} isProcessingOrder={isProcessingOrder} totalAmount={cartTotal} />
        )}
      </div>

      <div className="md:col-span-1">
        <Card className="shadow-lg sticky top-24">
          <CardHeader> <CardTitle>Order Summary</CardTitle> <CardDescription>{cartItems.length} item(s)</CardDescription> </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {cartItems.map(item => {
               const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
               const sale = flashSalesMap.get(item.id);
               const finalPrice = sale ? getDiscountedPrice(item.price, sale) : item.price;
               return (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                     {itemImageUrl ? ( <Image src={itemImageUrl} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={itemImageHint}/> ) : ( <ImageIcon className="w-8 h-8 text-muted-foreground" /> )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    {sale && <Badge variant="destructive" className="mt-1 flex items-center gap-1"><Zap size={12}/> Flash Sale</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">GH₵{(finalPrice * item.quantity).toFixed(2)}</p>
                    {sale && <p className="text-xs text-muted-foreground line-through">GH₵{(item.price * item.quantity).toFixed(2)}</p>}
                  </div>
                </div>
               );
            })}
            <Separator />
            <div className="flex justify-between text-lg font-semibold"> <span>Total:</span> <span className="text-primary">GH₵{cartTotal.toFixed(2)}</span> </div>
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground p-4 border-t"> {showAddressPhoneForm ? "Please complete your delivery details above." : "Delivery and taxes calculated at next step (if applicable). This is a simulation."} </CardFooter>
        </Card>
      </div>
    </div>
  );
}
