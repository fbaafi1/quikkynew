import { Settings } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import type { BoostPlan } from '@/lib/types';
import AdminBoostSettingsClient from '@/components/admin/AdminBoostSettingsClient';

// Force dynamic rendering to prevent build-time static analysis
export const dynamic = 'force-dynamic';

async function getBoostSettings() {
    const plansPromise = supabase.from('boost_plans').select('*').order('price');
    const settingsPromise = supabase.from('app_settings').select('value').eq('key', 'max_boosted_products').single();

    const [plansResult, settingsResult] = await Promise.all([plansPromise, settingsPromise]);
    
    if (plansResult.error) throw new Error(`Could not fetch boost plans: ${plansResult.error.message}`);
    
    let maxBoosts = 10; // Default value
    if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
         // Ignore "not found" error, but throw others
        throw new Error(`Could not fetch app settings: ${settingsResult.error.message}`);
    }
    if(settingsResult.data) {
        maxBoosts = (settingsResult.data.value as { limit?: number })?.limit || 10;
    }
    
    return {
        plans: (plansResult.data as BoostPlan[]) || [],
        maxBoostedProducts: maxBoosts
    };
}


export default async function AdminBoostSettingsPage() {
    await verifyUserRole('admin', '/admin/boost-settings');
    const { plans, maxBoostedProducts } = await getBoostSettings();

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                    <Settings className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                    <span className="hidden sm:inline">Boost Settings</span>
                    <span className="sm:hidden">Settings</span>
                </h1>
            </div>
            <AdminBoostSettingsClient initialPlans={plans} initialMaxBoosts={maxBoostedProducts} />
        </div>
    );
}
