import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import type { Product, Category, Vendor, BoostPlan } from '@/lib/types';
import VendorProductsClient from '@/components/vendors/VendorProductsClient';

async function getVendorProductsData() {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated.");

    const vendorPromise = supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    const categoriesPromise = supabase.from('categories').select('id, name');
    const boostPlansPromise = supabase.from('boost_plans').select('*').eq('is_active', true).order('price');

    const [vendorResult, categoriesResult, boostPlansResult] = await Promise.all([vendorPromise, categoriesPromise, boostPlansPromise]);
    
    if (vendorResult.error || !vendorResult.data) {
        throw new Error(`Could not find a vendor profile for your user account. ${vendorResult.error?.message}`);
    }
    const vendor = vendorResult.data as Vendor;

    if (categoriesResult.error) throw new Error(`Could not fetch categories: ${categoriesResult.error.message}`);
    if (boostPlansResult.error) throw new Error(`Could not fetch boost plans: ${boostPlansResult.error.message}`);
    
    const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

    if (productsError) throw new Error(`Could not fetch products: ${productsError.message}`);

    const products: Product[] = productsData?.map((p: any) => ({
        ...p,
        categoryId: p.category_id,
        categoryName: p.categories?.name || 'N/A',
    })) || [];

    return {
        products,
        vendor,
        categories: (categoriesResult.data as Category[]) || [],
        boostPlans: (boostPlansResult.data as BoostPlan[]) || [],
    };
}


export default async function VendorProductsPage() {
    await verifyUserRole('vendor', '/vendor/products');
    
    let products: Product[] = [];
    let vendor: Vendor | undefined;
    let categories: Category[] = [];
    let boostPlans: BoostPlan[] = [];
    
    try {
        const data = await getVendorProductsData();
        products = data.products;
        vendor = data.vendor;
        categories = data.categories;
        boostPlans = data.boostPlans;
    } catch (error) {
        console.error('Error fetching vendor products data:', error);
        // Continue with empty data - the component will handle it gracefully
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Package size={30}/> My Products</h1>
                <Button asChild>
                    <Link href="/vendor/products/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                    </Link>
                </Button>
            </div>
            <VendorProductsClient
                products={products}
                vendor={vendor}
                categories={categories}
                boostPlans={boostPlans}
            />
        </div>
    );
}
