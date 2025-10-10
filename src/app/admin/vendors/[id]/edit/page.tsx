
import VendorForm from '@/components/admin/VendorForm';
import type { Vendor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PageParams {
  id: string;
}

interface EditVendorPageProps {
  params: PageParams;
}

async function getVendor(id: string) {
    const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single();

    if (vendorError || !vendorData) {
        console.error("Error fetching vendor:", vendorError?.message || "Not found");
        return null;
    }

    const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('id', vendorData.user_id)
        .single();
    
    if (userError) {
        console.warn(`Could not fetch user profile for vendor ${id}: ${userError.message}`);
    }

    const combinedVendorData: Vendor = {
      ...vendorData,
      user: userData || null,
    };

    return combinedVendorData;
}


export default async function EditVendorPage({ params }: EditVendorPageProps) {
  const { id } = params;
  const vendor = await getVendor(id);
  
  if (!vendor) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Vendor not found</h1>
        <p className="text-muted-foreground mt-2">The vendor you are trying to edit does not exist.</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/vendors"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Vendor List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/vendors"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Vendor List</Link>
        </Button>
        <VendorForm vendor={vendor} />
    </div>
  );
}
