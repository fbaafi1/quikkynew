import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OrderDetailClient from '@/components/orders/OrderDetailClient';
import type { Order, OrderStatus, OrderProductItem, Address as DeliveryAddress, PaymentMethod } from '@/lib/types';
import { verifyUserRole, getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageParams {
  orderId: string;
}

interface OrderDetailPageProps {
  params: PageParams;
}

// Data fetching function for the server component
async function getOrderDetails(orderId: string, currentUserId: string, currentUserRole: string) {
  const supabase = createServerComponentClient({ cookies });

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
        products (id, name, description, price, images, category_id, stock, vendor_id, vendors (id, store_name))
      )
    `)
    .eq('id', orderId);

  // If user is a customer, only show their own orders
  if (currentUserRole === 'customer') {
    query = query.eq('user_id', currentUserId);
  }
  // If user is a vendor, check if the order contains their products
  else if (currentUserRole === 'vendor') {
    // First get the vendor ID for the current user
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', currentUserId)
      .single();

    if (!vendorData) {
      return null; // Not a vendor
    }

    const vendorId = vendorData.id;

    // Get vendor's product IDs
    const { data: vendorProducts } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendorId);

    if (!vendorProducts || vendorProducts.length === 0) {
      return null; // Vendor has no products
    }

    const vendorProductIds = vendorProducts.map(p => p.id);

    // Check if this order contains any products from this vendor
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId)
      .in('product_id', vendorProductIds);

    if (!orderItems || orderItems.length === 0) {
      return null; // Order doesn't contain vendor's products
    }

    // If vendor has products in this order, allow access
  }
  // Admins can see all orders
  else if (currentUserRole === 'admin') {
    // No additional filtering needed for admins
  }
  // Unknown role - deny access
  else {
    return null;
  }

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
        images: oi.products?.images?.[0] ? [oi.products.images[0]] : [],
        categoryId: oi.products?.category_id || undefined,
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

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = params;

  // Get current user session and role for server-side
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Get user role
  const currentUserRole = session.user.user_metadata?.role || 'customer';

  const orderData = await getOrderDetails(orderId, session.user.id, currentUserRole);

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-muted-foreground">Loading order...</p>
      </div>
    }>
      <OrderDetailClient order={orderData} orderId={orderId} />
    </Suspense>
  );
}
