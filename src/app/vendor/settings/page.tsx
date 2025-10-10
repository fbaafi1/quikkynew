import StoreSettingsForm from '@/components/vendors/StoreSettingsForm';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import type { Vendor } from '@/lib/types';


async function getVendorDetails() {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated.");

    const { data, error } = await supabase
          .from('vendors')
          .select('store_name, description, contact_number')
          .eq('user_id', userId)
          .single();
    
    if (error) {
        console.error("Failed to fetch vendor details:", error.message);
        // Returning null will allow the form to render with empty values.
        return null;
    }
    return data as Partial<Vendor>;
}


export default async function VendorSettingsPage() {
  await verifyUserRole('vendor', '/vendor/settings');
  const vendor = await getVendorDetails();

  return (
    <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6">
            Store Settings
        </h1>
        <StoreSettingsForm initialData={vendor} />
    </div>
  );
}
