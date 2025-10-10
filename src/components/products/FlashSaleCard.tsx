
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { FlashSale } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '../ui/badge';
import { Zap } from 'lucide-react';

const getDiscountedPrice = (price: number, type: 'percentage' | 'fixed_amount', value: number) => {
    if (type === 'percentage') {
        return price * (1 - value / 100);
    }
    return Math.max(0, price - value);
};

export default function FlashSaleCard({ sale }: { sale: FlashSale }) {
  if (!sale.products) return null;

  const discountedPrice = getDiscountedPrice(sale.products.price, sale.discount_type, sale.discount_value);

  return (
    <Link href={`/products/${sale.product_id}`} className="block group">
      <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full border-destructive">
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative w-full overflow-hidden bg-background flex items-center justify-center">
            {sale.products.images?.[0] ? (
              <Image
                src={sale.products.images[0].split('" data-ai-hint="')[0]}
                alt={sale.products.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-contain group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Zap className="w-12 h-12 text-muted-foreground" />
            )}
            <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-sm">
                {sale.discount_type === 'percentage' 
                    ? `${sale.discount_value}% OFF`
                    : `SAVE GH₵${sale.discount_value}`
                }
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 flex-grow flex flex-col justify-between">
            <div>
                <p className="text-sm font-semibold hover:text-primary transition-colors leading-tight truncate">{sale.products.name}</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
                <p className="text-lg font-bold text-destructive">GH₵{discountedPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground line-through">GH₵{sale.products.price.toFixed(2)}</p>
            </div>
        </CardContent>
      </Card>
    </Link>
  );
}
