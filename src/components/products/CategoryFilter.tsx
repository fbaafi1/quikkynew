
"use client";

import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SheetClose } from '@/components/ui/sheet';

interface CategoryFilterProps {
  categories: Category[];
  onClearFilters?: () => void; // Make optional as it's not always needed
}

export default function CategoryFilter({ categories, onClearFilters }: CategoryFilterProps) {
  const renderButton = (content: React.ReactNode, onClick?: () => void) => {
      if (onClearFilters) { // If it's used within a Sheet, wrap with SheetClose
          return <SheetClose asChild><Button variant="outline" onClick={onClick} className="rounded-full hover:bg-primary hover:text-primary-foreground">{content}</Button></SheetClose>
      }
      return <Button variant="outline" asChild className="rounded-full hover:bg-primary hover:text-primary-foreground"><Link href="/">{content}</Link></Button>
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {onClearFilters && renderButton('All Products', onClearFilters)}
      
      {categories.map(category => (
          <SheetClose asChild key={category.id}>
              <Button
                  variant="outline"
                  className="rounded-full hover:bg-primary hover:text-primary-foreground"
                  asChild
              >
                  <Link href={`/products/category/${category.id}`}>
                      {category.name}
                  </Link>
              </Button>
          </SheetClose>
      ))}
    </div>
  );
}
