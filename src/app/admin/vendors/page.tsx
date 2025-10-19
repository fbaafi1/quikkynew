import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Store } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import AdminVendorsClient from '@/components/admin/AdminVendorsClient';
import type { Vendor } from '@/lib/types';


async function getVendors() {
    const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

    if (vendorsError) throw vendorsError;
    if (!vendorsData) return [];

    const userIds = vendorsData.map(v => v.user_id).filter(Boolean);
    if (userIds.length === 0) return vendorsData as Vendor[];

    const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .in('id', userIds);

    if (usersError) {
        console.error("Error fetching user profiles for vendors:", usersError.message);
        // Return vendors without user data if profiles fail
        return vendorsData as Vendor[];
    }
    
    const usersMap = new Map(usersData.map(u => [u.id, u]));
    const combinedVendors: Vendor[] = vendorsData.map(vendor => {
        const user = usersMap.get(vendor.user_id);
        return {
            ...vendor,
            user: user ? {
                email: user.email,
                name: user.name || '',
            } : null,
        };
    });

    return combinedVendors;
}


export default async function AdminVendorsPage() {
    await verifyUserRole('admin', '/admin/vendors');
    const vendors = await getVendors();

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                    <Store className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                    <span className="hidden sm:inline">Vendor Management</span>
                    <span className="sm:hidden">Vendors</span>
                </h1>
                <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/admin/vendors/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Add New Vendor</span>
                        <span className="sm:hidden">Add Vendor</span>
                    </Link>
                </Button>
            </div>
            <AdminVendorsClient initialVendors={vendors} />
        </div>
    );
}
