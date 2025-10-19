
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SheetClose } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { useCategoriesFallback } from '@/hooks/useCategoriesFallback';
import { useState } from 'react';

export default function CategoryNavigation({ isMobile = false }: { isMobile?: boolean }) {
  const { categoryTree, isLoading, error } = useCategoriesFallback();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    setLoadingCategory(categoryId);
    // Add a small delay to show the loading state before navigation
    setTimeout(() => {
      setLoadingCategory(null);
    }, 300);
  };

  if (isLoading) {
    return isMobile ? (
       <div className="flex items-center gap-2 p-4">
        <Spinner className="h-4 w-4" />
        <span>Loading Categories...</span>
      </div>
    ) : (
      <Button variant="ghost" disabled className="hover:bg-primary/90 hover:text-accent">
        <Spinner className="h-4 w-4 mr-2" />
        Categories
      </Button>
    );
  }

  if (error) {
    return isMobile ? (
      <div className="flex items-center gap-2 p-4 text-red-500">
        <span>Failed to load categories</span>
      </div>
    ) : (
      <Button variant="ghost" disabled className="hover:bg-primary/90 hover:text-accent">
        Categories (Error)
      </Button>
    );
  }

  if (isMobile) {
    return (
        <ScrollArea className="h-full w-full p-4">
            <h2 className="text-lg font-semibold mb-4 text-primary">Categories</h2>
            <div className="space-y-2">
                {categoryTree.map(mainCat => (
                    mainCat.subcategories.length > 0 ? (
                        // Categories with subcategories - expandable
                        <div key={mainCat.id} className="border rounded-lg">
                            <button
                                onClick={() => toggleCategory(mainCat.id)}
                                className="w-full text-left p-3 font-medium hover:bg-muted/50 rounded-t-lg transition-colors flex items-center justify-between"
                            >
                                <span>{mainCat.name}</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedCategories.has(mainCat.id) ? 'rotate-90' : ''}`} />
                            </button>
                        {expandedCategories.has(mainCat.id) && (
                            <div className="border-t bg-muted/20">
                                <div className="flex flex-col items-start pl-6 py-3 space-y-2">
                                    {loadingCategory === mainCat.id ? (
                                        // Loading skeleton for category
                                        <div className="w-full space-y-3">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex items-center gap-3 p-2">
                                                    <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                                                        <div className="h-2 w-1/2 bg-muted animate-pulse rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <Link href={`/products/category/${mainCat.id}`} className="text-primary font-medium hover:underline">
                                                All {mainCat.name}
                                            </Link>
                                            {mainCat.subcategories.map(subCat => (
                                            <Link key={subCat.id} href={`/products/category/${subCat.id}`} className="text-muted-foreground hover:underline">
                                                {subCat.name}
                                            </Link>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    ) : (
                        // Categories without subcategories - direct navigation
                        <div className="border rounded-lg">
                            {loadingCategory === mainCat.id ? (
                                // Loading skeleton for standalone category
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                                        <div className="flex-1 space-y-1">
                                            <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                                            <div className="h-2 w-1/2 bg-muted animate-pulse rounded" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link href={`/products/category/${mainCat.id}`} className="block p-3 hover:bg-muted/50 transition-colors">
                                    <span className="font-medium">{mainCat.name}</span>
                                </Link>
                            )}
                        </div>
                    )
                ))}
            </div>
        </ScrollArea>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hover:bg-primary/90 hover:text-accent">
          Categories
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        {categoryTree.map(mainCat => (
          mainCat.subcategories.length > 0 ? (
            <DropdownMenuSub key={mainCat.id}>
              <DropdownMenuSubTrigger>
                <span>{mainCat.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem asChild>
                    <Link href={`/products/category/${mainCat.id}`}>All {mainCat.name}</Link>
                  </DropdownMenuItem>
                  {mainCat.subcategories.map(subCat => (
                    <DropdownMenuItem key={subCat.id} asChild>
                      <Link href={`/products/category/${subCat.id}`}>{subCat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem key={mainCat.id} asChild>
              <Link href={`/products/category/${mainCat.id}`}>{mainCat.name}</Link>
            </DropdownMenuItem>
          )
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
