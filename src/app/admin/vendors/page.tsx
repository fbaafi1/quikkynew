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
    const combinedVendors: Vendor[] = vendorsData.map(vendor => ({
        ...vendor,
        user: usersMap.get(vendor.user_id) || null,
    }));

    return combinedVendors;
}


export default async function AdminVendorsPage() {
    await verifyUserRole('admin', '/admin/vendors');
    const vendors = await getVendors();

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Store size={30}/> Vendor Management</h1>
                <Button asChild>
                <Link href="/admin/vendors/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Vendor
                </Link>
                </Button>
            </div>
            <AdminVendorsClient initialVendors={vendors} />
        </div>
    );
}
