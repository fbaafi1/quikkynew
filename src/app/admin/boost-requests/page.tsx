import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import type { BoostRequest } from '@/lib/types';
import AdminBoostRequestsClient from '@/components/admin/AdminBoostRequestsClient';


async function getBoostRequests() {
    const { data: requestsData, error: reqError } = await supabase
        .from('boost_requests')
        .select(`*`)
        .order('created_at', { ascending: false });
    
    if (reqError) throw reqError;
    if (!requestsData || requestsData.length === 0) return [];
    
    const productIds = [...new Set(requestsData.map(r => r.product_id).filter(Boolean))];
    const vendorIds = [...new Set(requestsData.map(r => r.vendor_id).filter(Boolean))];

    const productsPromise = supabase.from('products').select('id, name, images').in('id', productIds);
    const vendorsPromise = supabase.from('vendors').select('id, store_name').in('id', vendorIds);
    
    const [productsResult, vendorsResult] = await Promise.all([productsPromise, vendorsPromise]);

    if (productsResult.error) throw new Error(`Products fetch failed: ${productsResult.error.message}`);
    if (vendorsResult.error) throw new Error(`Vendors fetch failed: ${vendorsResult.error.message}`);
    
    const productsMap = new Map(productsResult.data?.map(p => [p.id, p]));
    const vendorsMap = new Map(vendorsResult.data?.map(v => [v.id, v]));

    const combinedRequests = requestsData.map(req => ({
        ...req,
        products: productsMap.get(req.product_id) || null,
        vendors: vendorsMap.get(req.vendor_id) || null,
    }));

    return combinedRequests as BoostRequest[];
}


export default async function AdminBoostRequestsPage() {
    await verifyUserRole('admin', '/admin/boost-requests');
    const requests = await getBoostRequests();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Sparkles size={30}/> Boost Requests</h1>
            </div>
            <AdminBoostRequestsClient initialRequests={requests} />
        </div>
    );
}
