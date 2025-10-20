
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, HeartCrack } from 'lucide-react';
import type { Product } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import WishlistClient from '@/components/wishlist/WishlistClient';

// Force dynamic rendering to prevent build-time redirect issues
export const dynamic = 'force-dynamic';

async function getWishlistItems() {
    try {
        const userId = await getUserId();
        if (!userId) {
            // This case is handled by verifyUserRole, but as a fallback.
            return [];
        }

        const { data: wishlistData, error: wishlistError } = await supabase
            .from('wishlist_items')
            .select('products(*, vendors(id, store_name))') // Fetch product details directly
            .eq('user_id', userId);

        if (wishlistError) {
            console.error("Error fetching wishlist items:", wishlistError);
            throw new Error("Could not load your wishlist.");
        }

        // The data is already nested, so we just need to extract the product part.
        return (wishlistData?.map(item => item.products).filter(Boolean) as Product[]) || [];
    } catch (error) {
        console.error("Error in getWishlistItems:", error);
        return [];
    }
}


export default async function WishlistPage() {
    let wishlistItems: Product[] = [];

    try {
        await verifyUserRole('customer', '/wishlist');
        wishlistItems = await getWishlistItems();
    } catch (error) {
        // During build time or if verifyUserRole fails, return empty wishlist
        console.warn("Wishlist page: verifyUserRole failed during build or runtime:", error);
        wishlistItems = [];
    }

    if (wishlistItems.length === 0) {
        return (
            <div className="text-center py-20">
                <HeartCrack className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
                <h1 className="text-3xl font-semibold mb-4">Your Wishlist is Empty</h1>
                <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your wishlist yet.</p>
                <Button asChild size="lg">
                <Link href="/">Discover Products</Link>
                </Button>
            </div>
        );
    }


    return (
        <div className="max-w-4xl mx-auto">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">My Wishlist</CardTitle>
                    <CardDescription>You have {wishlistItems.length} item(s) in your wishlist.</CardDescription>
                </CardHeader>
                <CardContent>
                    <WishlistClient initialItems={wishlistItems} />
                </CardContent>
            </Card>
        </div>
  );
}
