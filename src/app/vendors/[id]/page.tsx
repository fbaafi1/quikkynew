
import type { Product, Vendor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ChevronLeft, Store, Phone, Info, ShieldCheck, Ban } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ContactVendorButton from '@/components/vendors/ContactVendorButton';
import { format } from 'date-fns';

interface PageParams {
  id: string;
}

async function getVendorData(vendorId: string) {
    if (!vendorId) {
      throw new Error("Vendor ID is missing.");
    }
    
    const vendorPromise = supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();
    
    const productsPromise = supabase
        .from('products')
        .select('*, categories(is_visible)')
        .eq('vendor_id', vendorId);

    const [vendorResult, productsResult] = await Promise.all([vendorPromise, productsPromise]);
    
    if (vendorResult.error) {
        if (vendorResult.error.code === 'PGRST116') {
            return { vendor: null, products: [] };
        }
        throw new Error(`Vendor: ${vendorResult.error.message}`);
    }
    
    if(productsResult.error) {
        throw new Error(`Products: ${productsResult.error.message}`);
    }

    const vendor = vendorResult.data as Vendor;
    const products = (productsResult.data?.filter(p => (p as any).categories?.is_visible !== false) || []) as Product[];
    
    return { vendor, products };
}

export default async function VendorStorefrontPage({ params }: { params: PageParams }) {
  // Await params in Next.js 15
  const { id: vendorId } = await params;

  try {
    const { vendor, products } = await getVendorData(vendorId);

    if (!vendor) {
      return (
        <div className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-red-700">Vendor Not Found</h1>
          <p className="text-muted-foreground mt-2">The storefront you are looking for does not exist.</p>
          <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
          </Button>
        </div>
      );
    }
    
    const now = new Date();
    const endDate = vendor.subscription_end_date ? new Date(vendor.subscription_end_date) : null;
    const isSubscriptionActive = !(endDate && endDate < now);

    return (
        <div className="space-y-8">
          <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-lg bg-accent/20 border-primary">
            <Avatar className="h-32 w-32 text-4xl border-4 border-primary shadow-md">
              <AvatarFallback className="bg-muted text-muted-foreground">{vendor.store_name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left space-y-2">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
                      <Store size={36}/> {vendor.store_name}
                  </h1>
                  {vendor.is_verified && (
                    <Badge className="bg-green-600 hover:bg-green-700 text-white">
                      <ShieldCheck className="mr-1 h-4 w-4"/> Verified
                    </Badge>
                  )}
                </div>
                {vendor.description && <p className="text-muted-foreground max-w-2xl"><Info size={16} className="inline mr-1" />{vendor.description}</p>}
                
                {vendor.contact_number && (
                  <div className="pt-4 flex justify-center md:justify-start">
                    <ContactVendorButton 
                      contactNumber={vendor.contact_number}
                      storeName={vendor.store_name}
                      disabled={!isSubscriptionActive}
                    />
                  </div>
                )}
            </div>
          </Card>
          
          {!isSubscriptionActive && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertTitle>Storefront Inactive</AlertTitle>
                <AlertDescription>
                    This vendor's subscription has expired. You can still view their products, but you may not be able to contact them or make new purchases at this time.
                </AlertDescription>
              </Alert>
          )}


          <div>
            <h2 className="text-2xl font-semibold mb-6">Products from {vendor.store_name}</h2>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <p className="text-lg">This vendor has no products listed at the moment.</p>
                <p>Check back later!</p>
              </div>
            )}
          </div>
        </div>
      );

  } catch (error: any) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error loading page</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }
}
