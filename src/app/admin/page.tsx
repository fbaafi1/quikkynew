import { DollarSign, Users, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import AdminStatsCard from '@/components/admin/AdminStatsCard';
import { Card } from '@/components/ui/card';

async function getAdminStats() {
    const customerCountPromise = supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');

    // Currently hardcoded as it is not implemented
    const totalRevenuePromise = Promise.resolve({ data: { total: 0 }, error: null });

    const [customerResult, revenueResult] = await Promise.all([customerCountPromise, totalRevenuePromise]);
    
    if (customerResult.error) {
        console.warn("Could not fetch customer count:", customerResult.error);
    }
     if (revenueResult.error) {
        console.warn("Could not fetch revenue:", revenueResult.error);
    }

    return {
        totalCustomers: customerResult.count || 0,
        totalRevenue: (revenueResult.data as any)?.total || 0,
    };
}


export default async function AdminDashboardPage() {
    await verifyUserRole('admin', '/admin');
    const { totalCustomers, totalRevenue } = await getAdminStats();

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                    <span className="hidden sm:inline">Admin Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <AdminStatsCard title="Total Revenue" value={`GH₵${totalRevenue.toFixed(2)}`} icon={DollarSign} description="All time revenue (Not Implemented)" />
                <AdminStatsCard title="Total Customers" value={totalCustomers} icon={Users} description="Registered customers" />
            </div>
            
            <Card className="p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">Future implementation: Add a chart or recent activity log here</p>
            </Card>
        </div>
    );
}
