
"use client";

import Image from 'next/image';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Eye, CalendarDays, CreditCard } from 'lucide-react';

interface OrderListItemProps {
  order: Order;
}

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/40x40.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`;
  let hint: string = itemName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc;
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/40x40.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};

const getStatusBadgeVariant = (status: Order['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Pending': return "default";
    case 'Processing': return "default";
    case 'Shipped': return "secondary";
    case 'Delivered': return "default";
    case 'Cancelled':
    case 'Payment Failed': return "destructive";
    default: return "outline";
  }
};

export default function OrderListItem({ order }: OrderListItemProps) {
  return (
    <div className="border rounded-lg p-2 hover:bg-muted/50 transition-colors">
      {/* Order Header - Ultra Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">#{order.id.substring(0, 8)}...</div>
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs px-1.5 py-0.5">
            {order.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays size={10} />
          {new Date(order.orderDate).toLocaleDateString()}
        </div>
      </div>

      {/* Items Display - Ultra Compact Horizontal Layout */}
      <div className="space-y-1 mb-2">
        {order.items.slice(0, 2).map(item => { // Show max 2 items for compact view
          const { src: itemImageUrl } = getImageAttributes(item.images[0], item.name);
          return (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {itemImageUrl ? (
                  <Image
                    src={itemImageUrl}
                    alt={item.name}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium truncate text-xs">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          );
        })}

        {order.items.length > 2 && (
          <div className="text-xs text-muted-foreground text-center py-0.5">
            +{order.items.length - 2} more
          </div>
        )}
      </div>

      {/* Order Footer - Ultra Compact */}
      <div className="flex items-center justify-between pt-1.5 border-t">
        <div className="text-xs">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-bold text-primary">GH₵{order.totalAmount.toFixed(2)}</span>
        </div>
        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Link href={`/orders/${order.id}`}>
            <Eye className="mr-1 h-2.5 w-2.5" />
            Details
          </Link>
        </Button>
      </div>

      {order.transactionId && (
        <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
          TxID: {order.transactionId}
        </div>
      )}
    </div>
  );
}
