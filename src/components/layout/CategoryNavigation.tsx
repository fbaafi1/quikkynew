
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SheetClose } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { useCategoriesFallback } from '@/hooks/useCategoriesFallback';

export default function CategoryNavigation({ isMobile = false }: { isMobile?: boolean }) {
  const { categoryTree, isLoading, error } = useCategoriesFallback();

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
            <h2 className="text-lg font-semibold mb-2 text-primary">Categories</h2>
            <Accordion type="multiple" className="w-full">
                {categoryTree.map(mainCat => (
                <AccordionItem key={mainCat.id} value={mainCat.id}>
                    <AccordionTrigger>{mainCat.name}</AccordionTrigger>
                    <AccordionContent>
                    <div className="flex flex-col items-start pl-4">
                        <SheetClose asChild>
                            <Button variant="link" asChild className="p-0 h-auto justify-start text-primary">
                                <Link href={`/products/category/${mainCat.id}`}>All {mainCat.name}</Link>
                            </Button>
                        </SheetClose>
                        {mainCat.subcategories.map(subCat => (
                        <SheetClose asChild key={subCat.id}>
                            <Button variant="link" asChild className="p-0 h-auto justify-start text-muted-foreground">
                                <Link href={`/products/category/${subCat.id}`}>{subCat.name}</Link>
                            </Button>
                        </SheetClose>
                        ))}
                    </div>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
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
