import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package } from 'lucide-react';
import { verifyUserRole } from '@/lib/auth';
import VendorProductsClient from '@/components/vendors/VendorProductsClient';

// Force dynamic rendering to prevent build-time redirect issues
export const dynamic = 'force-dynamic';

export default async function VendorProductsPage() {
    await verifyUserRole('vendor', '/vendor/products');

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <Package size={30}/> My Products
                </h1>
                <Button asChild>
                    <Link href="/vendor/products/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                    </Link>
                </Button>
            </div>
            <VendorProductsClient />
        </div>
    );
}
