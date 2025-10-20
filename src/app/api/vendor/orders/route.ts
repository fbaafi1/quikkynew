import { NextResponse } from 'next/server';
import { verifyUserRole, getUserId } from '@/lib/auth';
import { supabase, ensureSupabaseConfigured } from '@/lib/supabaseClient';
import type { OrderStatus } from '@/lib/types';

// Force Edge runtime to prevent static analysis during build
export const runtime = 'edge';

export async function GET() {
    // Ensure Supabase is properly configured before making database calls
    ensureSupabaseConfigured();

    try {
        // Verify user is a vendor
        await verifyUserRole('vendor', '/vendor/orders');

        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Get vendor ID
        const { data: vendorData, error: vendorError } = await supabase
            .from('vendors')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (vendorError || !vendorData) {
            return NextResponse.json(
                { error: 'Could not find vendor profile' },
                { status: 404 }
            );
        }

        const vendorId = (vendorData as { id: string }).id;

        // Get vendor's product IDs
        const { data: productIdsData, error: productIdsError } = await supabase
            .from('products')
            .select('id')
            .eq('vendor_id', vendorId);

        if (productIdsError) {
            return NextResponse.json(
                { error: 'Failed to fetch vendor products' },
                { status: 500 }
            );
        }

        const vendorProductIds = productIdsData.map((p: { id: string }) => p.id);

        if (vendorProductIds.length === 0) {
            return NextResponse.json([]);
        }

        // Get order IDs that contain vendor's products
        const { data: orderItemsData, error: orderItemsError } = await supabase
            .from('order_items')
            .select('order_id')
            .in('product_id', vendorProductIds);

        if (orderItemsError) {
            return NextResponse.json(
                { error: 'Failed to fetch order items' },
                { status: 500 }
            );
        }

        const relevantOrderIds = [...new Set(orderItemsData.map((item: { order_id: string }) => item.order_id))];

        if (relevantOrderIds.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch orders with product details
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id, user_id, total_amount, status, order_date,
                order_items (
                    id, product_id, quantity, price_at_purchase, product_name, product_image,
                    products (id, name, images)
                )
            `)
            .in('id', relevantOrderIds)
            .neq('status', 'Delivered') // Exclude delivered orders by default
            .order('order_date', { ascending: false });

        if (ordersError) {
            return NextResponse.json(
                { error: 'Failed to fetch orders' },
                { status: 500 }
            );
        }

        // Get user profiles for customer information
        const userIds = [...new Set(ordersData.map((o: { user_id: string }) => o.user_id).filter(Boolean))];
        let userProfilesMap = new Map();
        if (userIds.length > 0) {
            const { data: profilesData } = await supabase
                .from('user_profiles')
                .select('id, email, name')
                .in('id', userIds);
            if (profilesData) {
                profilesData.forEach((p: { id: string; email?: string; name?: string }) =>
                    userProfilesMap.set(p.id, p)
                );
            }
        }

        // Format the orders data
        const formattedOrders = (ordersData || []).map((o: any) => {
            const userProfile = userProfilesMap.get(o.user_id);
            return {
                id: o.id,
                user_id: o.user_id,
                customer_email: userProfile?.email || 'N/A',
                customer_name: userProfile?.name || 'Guest',
                orderDate: o.order_date,
                totalAmount: o.total_amount,
                status: o.status as OrderStatus,
                item_count: o.order_items?.length || 0,
                products: o.order_items?.map((item: any) => ({
                    id: item.products?.id || item.product_id,
                    name: item.product_name || item.products?.name || 'Unknown Product',
                    image: item.product_image || item.products?.images?.[0],
                    quantity: item.quantity,
                    price: item.price_at_purchase,
                })) || [],
            };
        });

        return NextResponse.json(formattedOrders);

    } catch (error: any) {
        console.error('Vendor orders API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
