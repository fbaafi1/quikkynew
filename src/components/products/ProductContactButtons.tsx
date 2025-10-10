'use client';

import { Phone, MessageCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProductContactButtonsProps {
  vendorPhone: string | null | undefined;
  className?: string;
  vendorName?: string;
}

export default function ProductContactButtons({ 
  vendorPhone, 
  className = '',
  vendorName = 'the vendor'
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

  // Format phone number by removing any non-digit characters
  const formattedPhone = vendorPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=Hi! I'm interested in your product on QuiKart.`;
  const telUrl = `tel:${formattedPhone}`;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(vendorPhone);
    alert(`Phone number copied to clipboard!`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-muted-foreground">
        Contact {vendorName} about this product:
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Call Button */}
        <Link 
          href={telUrl}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          aria-label={`Call ${vendorName}`}
        >
          <Phone className="w-5 h-5" />
          <span>Call Vendor</span>
        </Link>
        
        {/* WhatsApp Button */}
        <Link 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          aria-label={`Message ${vendorName} on WhatsApp`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>WhatsApp</span>
        </Link>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>or</span>
        <Button 
          variant="link" 
          size="sm" 
          className="h-auto p-0 text-blue-600 hover:text-blue-800"
          onClick={handleCopyNumber}
        >
          Copy phone number
        </Button>
      </div>
    </div>
  );
}
