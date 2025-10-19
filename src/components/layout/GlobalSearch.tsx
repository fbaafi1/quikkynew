
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Search, Package, Tag, Store, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const DEBOUNCE_DELAY = 50; // Very responsive for instant feel

interface Suggestion {
  id: string;
  type: 'product' | 'category' | 'vendor';
  name: string;
  image?: string;
  secondaryText?: string;
  isPopular?: boolean;
  isPlaceholder?: boolean;
}

const getProductImageSrc = (imageString?: string) => {
  if (!imageString) return "https://placehold.co/40x40.png";
  return imageString.split('" data-ai-hint="')[0];
};

// Optimized search query with React Query
const useSearchSuggestions = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-suggestions', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim() || searchTerm.trim().length < 1) {
        return [];
      }

      const termQuery = `%${searchTerm.trim()}%`;

      try {
        // Use separate queries for better control and stability
        const [nameResults, descResults, categoriesResult, vendorsResult] = await Promise.all([
          // Search in product names
          supabase
            .from('products')
            .select('id, name, description, images, vendors(store_name)')
            .ilike('name', `%${searchTerm.trim()}%`)
            .limit(2),
          // Also search in product descriptions
          supabase
            .from('products')
            .select('id, name, description, images, vendors(store_name)')
            .ilike('description', `%${searchTerm.trim()}%`)
            .limit(2),
          supabase
            .from('categories')
            .select('id, name')
            .ilike('name', `%${searchTerm.trim()}%`)
            .limit(3),
          supabase
            .from('vendors')
            .select('id, store_name')
            .ilike('store_name', `%${searchTerm.trim()}%`)
            .limit(3)
        ]);

        // Combine and deduplicate product results
        const allProducts = [...(nameResults.data || []), ...(descResults.data || [])];
        const uniqueProducts = allProducts.filter((product, index, self) =>
          index === self.findIndex(p => p.id === product.id)
        );

        const productSuggestions: Suggestion[] = uniqueProducts.slice(0, 4).map((p: any) => ({
          id: p.id,
          type: 'product' as const,
          name: p.name,
          image: getProductImageSrc(p.images?.[0]),
          secondaryText: `in ${p.vendors?.store_name || 'General'}`,
          // Highlight if search term appears in description
          isPopular: p.description && p.description.toLowerCase().includes(searchTerm.trim().toLowerCase())
        }));

        const categorySuggestions: Suggestion[] = (categoriesResult.data || []).map((c: any) => ({
          id: c.id,
          type: 'category' as const,
          name: c.name
        }));

        const vendorSuggestions: Suggestion[] = (vendorsResult.data || []).map((v: any) => ({
          id: v.id,
          type: 'vendor' as const,
          name: v.store_name,
          secondaryText: 'Store'
        }));

        return [...productSuggestions, ...categorySuggestions, ...vendorSuggestions].slice(0, 6);

      } catch (error) {
        console.error("Error fetching search suggestions:", error);
        return [];
      }
    },
    enabled: searchTerm.trim().length >= 1,
    staleTime: 10 * 1000, // Cache for 10 seconds (responsive)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't refetch on mount for better UX
  });
};

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use React Query for search suggestions
  const { data: suggestions = [], isLoading, error } = useSearchSuggestions(searchTerm);

  // Debounce the search input
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.isPlaceholder) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(false);
    setSearchTerm('');

    try {
      if (suggestion.type === 'product') {
        router.push(`/products/${suggestion.id}`);
      } else if (suggestion.type === 'category') {
        router.push(`/products?category=${suggestion.id}`);
      } else if (suggestion.type === 'vendor') {
        router.push(`/vendors/${suggestion.id}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm) {
      setShowSuggestions(false);
      router.push(`/products?q=${encodeURIComponent(trimmedTerm)}`);
      setSearchTerm('');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const getIconForType = (type: Suggestion['type']): JSX.Element | null => {
    switch (type) {
      case 'product':
        return <Package className="h-4 w-4 text-foreground" />;
      case 'category':
        return <Tag className="h-4 w-4 text-foreground" />;
      case 'vendor':
        return <Store className="h-4 w-4 text-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Input
          placeholder="Search for products, brands and categories"
          className="h-10 pr-20 rounded-full border-2 border-primary/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200 text-foreground"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchTerm.trim().length >= 1) {
              setShowSuggestions(true);
            }
          }}
          aria-label="Search products and categories"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 flex items-center gap-1">
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-muted/50"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-transparent"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </form>

      {showSuggestions && searchTerm.trim().length >= 1 && (
        <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-lg shadow-xl z-50 max-h-[32rem] overflow-y-auto">
          {suggestions.length > 0 ? (
            <ul className="divide-y divide-muted-foreground">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="group flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors duration-150 rounded-md"
                >
                  {suggestion.type === 'product' && suggestion.image ? (
                    <Image
                      src={suggestion.image}
                      alt={suggestion.name}
                      width={40}
                      height={40}
                      className="rounded-md object-cover h-10 w-10 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      {getIconForType(suggestion.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">
                      {suggestion.name}
                    </p>
                    {suggestion.secondaryText && (
                      <p className="text-xs text-muted-foreground/80 group-hover:text-muted-foreground truncate">
                        {suggestion.secondaryText}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : !isLoading ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No results for "{searchTerm}"
            </div>
          ) : (
            <div className="p-2 flex justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
