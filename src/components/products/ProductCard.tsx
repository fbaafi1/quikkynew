
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, ImageIcon, Heart, Rocket } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, productName: string = "Product") => {
  let src: string = `https://placehold.co/400x300.png?text=${encodeURIComponent(productName.split(' ').slice(0,1).join('') || 'Product')}`;
  let hint: string = productName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc;
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = productName.split(' ').slice(0, 2).join(' ') || 'Product';
      src = `https://placehold.co/400x300.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();
  const router = useRouter();

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); 
    if (!currentUser) {
      router.push(`/auth/login?redirect=/`);
      return;
    }
    addToCart(product);
  };

  const handleWishlistToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!currentUser) {
      router.push(`/auth/login?redirect=/`);
      return;
    }
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };
  
  const handleVendorLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation(); // Prevents any parent link handlers from firing.
  };

  const { src: mainImageUrl, hint: mainImageHint } = getImageAttributes(product.images?.[0], product.name);
  const inWishlist = isInWishlist(product.id);
  const isBoosted = product.is_boosted && product.boosted_until && new Date(product.boosted_until) > new Date();

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 h-full group border-transparent hover:border-primary">
      <div className="relative">
        <Link href={`/products/${product.id}`} className="block relative" aria-label={`View details for ${product.name}`}>
          <div className="aspect-[4/3] w-full overflow-hidden bg-background flex items-center justify-center">
            {mainImageUrl ? (
              <Image
                src={mainImageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain group-hover:scale-105 transition-transform duration-300"
                data-ai-hint={mainImageHint}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </Link>
        {isBoosted && (
          <Badge variant="default" className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground flex items-center gap-1 shadow-lg text-xs">
            <Rocket size={10} />
            Featured
          </Badge>
        )}
        <Button
          variant="secondary"
          size="icon"
          onClick={handleWishlistToggle}
          aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/70 hover:bg-background shadow-md backdrop-blur-sm"
          title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart className={cn('h-4 w-4 text-primary', inWishlist && 'fill-primary')} />
        </Button>
      </div>

      <CardContent className="p-3 flex flex-col flex-grow justify-between">
        <div className="min-h-0">
          <Link href={`/products/${product.id}`} className="hover:text-primary transition-colors">
            <p className="text-sm font-semibold leading-tight line-clamp-2" title={product.name}>
              {product.name}
            </p>
          </Link>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-base font-bold text-primary">GH₵{product.price.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-3">
          <Button
            onClick={handleAddToCart}
            className="w-full relative z-10"
            size="sm"
            aria-label={product.stock > 0 ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
            disabled={product.stock === 0 && currentUser !== null}
            title={product.stock > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Login to Add to Cart')}
          >
            <ShoppingCart size={14} />
            <span className="ml-2 text-sm">
              {product.stock > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Add to Cart')}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
