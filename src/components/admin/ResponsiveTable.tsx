'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableWrapper({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop view - scrollable table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          {children}
        </div>
      </div>
      
      {/* Mobile view - will be handled by individual components */}
      <div className="md:hidden">
        {children}
      </div>
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
}

export function MobileCard({ children, className = '' }: MobileCardProps) {
  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      {children}
    </Card>
  );
}

interface MobileCardRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileCardRow({ label, value, className = '' }: MobileCardRowProps) {
  return (
    <div className={`flex justify-between items-start gap-2 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground min-w-[100px]">{label}:</span>
      <span className="text-sm text-right flex-1">{value}</span>
    </div>
  );
}
