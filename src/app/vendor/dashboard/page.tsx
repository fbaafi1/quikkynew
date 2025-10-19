import { LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import type { Product, AdminOrderSummary } from '@/lib/types';
import VendorDashboardClient from '@/components/vendors/VendorDashboardClient';


async function getVendorDashboardData() {
    const userId = await getUserId();
    // verifyUserRole already handles the redirect if userId is null, but this is a safeguard.
    if (!userId) throw new Error("User not found or not authenticated.");

    const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, subscription_end_date, agreement_accepted, agreement_accepted_at')
        .eq('user_id', userId)
        .single();
    
    if (vendorError || !vendorData) throw new Error(`Failed to fetch vendor details: ${vendorError?.message || 'Not found'}`);
    const vendorId = vendorData.id;

    // Fetch stats
    const productCountPromise = supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId);
    const lowStockPromise = supabase.from('products').select('id, name, stock').eq('vendor_id', vendorId).lte('stock', 5);

    // Fetch order related data
    const { data: productIdsData } = await supabase.from('products').select('id').eq('vendor_id', vendorId);
    const vendorProductIds = productIdsData?.map(p => p.id) || [];
    let ordersPromise: Promise<any> = Promise.resolve({ data: [], error: null });
    let orderItemsData: any[] = [];

    if(vendorProductIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase.from('order_items').select('order_id, quantity, price_at_purchase').in('product_id', vendorProductIds);
        if (itemsError) throw itemsError;
        orderItemsData = itemsData || [];
        
        const orderIds = [...new Set(orderItemsData?.map(item => item.order_id))];

        if (orderIds.length > 0) {
            ordersPromise = supabase.from('orders').select('id, user_id, status, order_date, total_amount, user_profiles(name, email)').in('id', orderIds);
        }
    }

    const [productCountResult, lowStockResult, ordersResult] = await Promise.all([
        productCountPromise, lowStockPromise, ordersPromise
    ]);

    // Process Stats
    const productCount = productCountResult.count || 0;
    const lowStockProducts = (lowStockResult.data as Product[]) || [];
    
    // Process Orders
    const ordersData = ordersResult.data || [];
    const totalOrders = ordersData.length || 0;
    const pendingOrders = ordersData.filter((o: any) => o.status === 'Pending').length || 0;
    const deliveredOrderIds = ordersData.filter((o: any) => o.status === 'Delivered').map((o: any) => o.id) || [];
    const totalRevenue = orderItemsData?.filter((item: any) => deliveredOrderIds.includes(item.order_id)).reduce((sum: number, item: any) => sum + (item.price_at_purchase * item.quantity), 0) || 0;

    const sortedOrders = ordersData.sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    const recentOrders: AdminOrderSummary[] = sortedOrders.slice(0, 5).map((o: any) => ({
        id: o.id,
        orderDate: o.order_date,
        customer_name: o.user_profiles?.name || 'Guest',
        totalAmount: o.total_amount,
        status: o.status,
        item_count: 0 // This will be calculated on client if needed, or joined differently
    }));

    return {
        vendorDetails: vendorData,
        stats: { productCount, totalOrders, pendingOrders, totalRevenue },
        lowStockProducts,
        recentOrders,
    };
}


export default async function VendorDashboardPage() {
    await verifyUserRole('vendor', '/vendor/dashboard');
    const { vendorDetails, stats, lowStockProducts, recentOrders } = await getVendorDashboardData();

    return (
        <div className="space-y-6">
            <h1 className="text-xl xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <LayoutDashboard size={30} /> Dashboard Overview
            </h1>
            <VendorDashboardClient
                vendorDetails={vendorDetails}
                stats={stats}
                lowStockProducts={lowStockProducts}
                recentOrders={recentOrders}
            />
        </div>
    );
}
