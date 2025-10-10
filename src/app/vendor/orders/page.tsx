import { ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import type { AdminOrderSummary, OrderStatus } from '@/lib/types';
import VendorOrdersClient from '@/components/vendors/VendorOrdersClient';

async function getVendorOrders() {
    const userId = await getUserId();
    if (!userId) throw new Error("User not found or not authenticated.");

    const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .single();
    
    if (vendorError || !vendorData) throw new Error("Could not find a vendor profile for your user account.");
    const vendorId = vendorData.id;

    const { data: productIdsData, error: productIdsError } = await supabase
        .from('products')
        .select('id')
        .eq('vendor_id', vendorId);
    
    if (productIdsError) throw productIdsError;
    const vendorProductIds = productIdsData.map(p => p.id);

    if (vendorProductIds.length === 0) return [];

    const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('order_id')
        .in('product_id', vendorProductIds);
    
    if (orderItemsError) throw orderItemsError;
    const relevantOrderIds = [...new Set(orderItemsData.map(item => item.order_id))];

    if (relevantOrderIds.length === 0) return [];

    const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`id, user_id, total_amount, status, order_date, order_items(id)`)
        .in('id', relevantOrderIds)
        .order('order_date', { ascending: false });

    if (ordersError) throw ordersError;

    const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
    let userProfilesMap = new Map();
    if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('user_profiles').select('id, email, name').in('id', userIds);
        if (profilesData) profilesData.forEach(p => userProfilesMap.set(p.id, p));
    }

    const fetchedOrders: AdminOrderSummary[] = (ordersData || []).map((o: any) => {
        const userProfile = userProfilesMap.get(o.user_id);
        return {
            id: o.id,
            user_id: o.user_id,
            customer_email: userProfile?.email || 'N/A',
            customer_name: userProfile?.name || 'Guest',
            orderDate: o.order_date,
            totalAmount: o.total_amount,
            status: o.status as OrderStatus,
            item_count: o.order_items.length,
        };
    });

    return fetchedOrders;
}


export default async function VendorOrdersPage() {
    await verifyUserRole('vendor', '/vendor/orders');
    const orders = await getVendorOrders();

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><ClipboardList size={30}/> My Orders</h1>
            </div>
            <VendorOrdersClient initialOrders={orders} />
        </div>
    );
}
