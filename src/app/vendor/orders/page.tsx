import { ClipboardList } from 'lucide-react';
import VendorOrdersClient from '@/components/vendors/VendorOrdersClient';

export default async function VendorOrdersPage() {
    // Remove server-side data fetching to prevent build-time Supabase issues
    // Data will be fetched client-side by VendorOrdersClient component

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <ClipboardList size={30}/>
                        My Orders
                    </h1>
                    {/* Badge will be rendered client-side for dynamic updates */}
                </div>
            </div>
            <VendorOrdersClient initialOrders={[]} />
        </div>
    );
}
