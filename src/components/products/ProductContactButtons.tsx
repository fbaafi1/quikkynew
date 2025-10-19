'use client';

import { Phone, MessageCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProductContactButtonsProps {
  vendorPhone: string | null | undefined;
  className?: string;
  vendorName?: string;
  isVendorSubscriptionActive?: boolean;
}

export default function ProductContactButtons({ 
  vendorPhone, 
  className = '',
  vendorName = 'the vendor',
  isVendorSubscriptionActive = true
}: ProductContactButtonsProps) {
  if (!vendorPhone) {
    return (
      <div className={`mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Contact information not available for {vendorName}.</p>
        </div>
      </div>
    );
  }

  // If vendor subscription is inactive, show disabled state
  if (!isVendorSubscriptionActive) {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-sm text-muted-foreground">
          Contact {vendorName} about this product:
        </p>
        <div className="flex gap-2 sm:gap-3">
          {/* Disabled Call Button */}
          <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Call</span>
          </div>

          {/* Disabled WhatsApp Button */}
          <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">WhatsApp</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span>Vendor subscription inactive</span>
        </div>
      </div>
    );
  }

  // Format phone number by removing any non-digit characters
  const formattedPhone = vendorPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=Hi! I'm interested in your product on QuiKart.`;
  const telUrl = `tel:${formattedPhone}`;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(vendorPhone);
    alert(`Phone number copied to clipboard!`);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-muted-foreground">
        Contact {vendorName} about this product:
      </p>
      <div className="flex gap-2 sm:gap-3">
        {/* Call Button */}
        <Link
          href={telUrl}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
          aria-label={`Call ${vendorName}`}
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Call</span>
        </Link>

        {/* WhatsApp Button */}
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
          aria-label={`Message ${vendorName} on WhatsApp`}
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">WhatsApp</span>
        </Link>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <span>or</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
          onClick={handleCopyNumber}
        >
          Copy phone number
        </Button>
      </div>
    </div>
  );
}
