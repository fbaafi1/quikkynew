import { Sparkles } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabaseServerClient';
import { verifyUserRole } from '@/lib/auth';
import type { BoostRequest } from '@/lib/types';
import AdminBoostRequestsClient from '@/components/admin/AdminBoostRequestsClient';

export const dynamic = 'force-dynamic';


async function getBoostRequests() {
    const supabase = createServerSupabaseClient();

    // Use a single query with joins to get all data efficiently
    const { data: requestsData, error: reqError } = await supabase
        .from('boost_requests')
        .select(`
            *,
            products:product_id (
                id,
                name,
                images
            ),
            vendors:vendor_id (
                id,
                store_name
            )
        `)
        .order('created_at', { ascending: false });

    if (reqError) throw reqError;

    // Transform the data to match the expected format
    const combinedRequests = (requestsData || []).map(req => ({
        ...req,
        products: req.products || null,
        vendors: req.vendors || null,
    }));

    return combinedRequests as BoostRequest[];
}


export default async function AdminBoostRequestsPage() {
    await verifyUserRole('admin', '/admin/boost-requests');
    const requests = await getBoostRequests();

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                    <span className="hidden sm:inline">Boost Requests</span>
                    <span className="sm:hidden">Boosts</span>
                </h1>
            </div>
            <AdminBoostRequestsClient initialRequests={requests} />
        </div>
    );
}
