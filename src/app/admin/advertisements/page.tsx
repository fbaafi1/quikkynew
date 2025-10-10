import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import AdminAdvertisementsClient from '@/components/admin/AdminAdvertisementsClient';
import type { Advertisement } from '@/lib/types';


async function getAdvertisements() {
    const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching advertisements:", error.message);
        throw new Error("Could not fetch advertisements. Please check your Supabase connection and permissions.");
    }
    return data as Advertisement[];
}


export default async function AdminAdvertisementsPage() {
    await verifyUserRole('admin', '/admin/advertisements');
    const advertisements = await getAdvertisements();

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Megaphone size={30}/> Advertisement Management</h1>
                <Button asChild>
                <Link href="/admin/advertisements/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Advertisement
                </Link>
                </Button>
            </div>
            <AdminAdvertisementsClient initialAdvertisements={advertisements} />
        </div>
    );
}
