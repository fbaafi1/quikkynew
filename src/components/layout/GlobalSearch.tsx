
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import type { Product, Category, Vendor } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Search, Package, Tag, Store } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Image from 'next/image';
import { Button } from '../ui/button';

const DEBOUNCE_DELAY = 150; // Reduced from 300ms to 150ms for faster response

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

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchCache = useRef<Record<string, Suggestion[]>>({});

  // Memoize the fetch function to prevent recreation on every render
  const fetchSuggestions = useCallback(async (term: string) => {
    const trimmedTerm = term.trim();
    
    // Don't search for very short terms
    if (trimmedTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }
    
    // Check cache first
    if (searchCache.current[trimmedTerm]) {
      setSuggestions(searchCache.current[trimmedTerm]);
      setShowSuggestions(true);
      setIsLoading(false);
      return;
    }
    
    // Show loading state
    setShowSuggestions(true);

    try {
      const termQuery = `%${trimmedTerm}%`;
      const [productsResult, categoriesResult, vendorsResult] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, images, vendors(store_name)')
          .ilike('name', termQuery)
          .limit(4),
        supabase
          .from('categories')
          .select('id, name')
          .ilike('name', termQuery)
          .limit(3),
        supabase
          .from('vendors')
          .select('id, store_name')
          .ilike('store_name', termQuery)
          .limit(3)
      ]);

      const productSuggestions: Suggestion[] = (productsResult.data || []).map((p: any) => ({
        id: p.id,
        type: 'product',
        name: p.name,
        image: getProductImageSrc(p.images?.[0]),
        secondaryText: `in ${p.vendors?.store_name || 'General'}`
      }));

      const categorySuggestions: Suggestion[] = (categoriesResult.data || []).map(c => ({
        id: c.id,
        type: 'category',
        name: c.name
      }));

      const vendorSuggestions: Suggestion[] = (vendorsResult.data || []).map(v => ({
        id: v.id,
        type: 'vendor',
        name: v.store_name,
        secondaryText: 'Store'
      }));

      // Combine all suggestions
      const allSuggestions = [...productSuggestions, ...categorySuggestions, ...vendorSuggestions];
      
      if (allSuggestions.length === 0) {
        // Show 'Not Found' message when no results
        setSuggestions([{
          id: 'not-found',
          type: 'product',
          name: 'No results found',
          secondaryText: 'Try different keywords',
          isPlaceholder: true
        }]);
      } else {
        // Limit to 4 items max
        const limitedSuggestions = allSuggestions.slice(0, 4);
        setSuggestions(limitedSuggestions);
      }
      
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed dependencies to prevent recreation

  // Debounce the search input
  useEffect(() => {
    const trimmedTerm = searchTerm.trim();
    
    // Clear suggestions immediately when search term is empty
    if (!trimmedTerm) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Show loading state immediately
    setIsLoading(true);
    
    const debounceTimer = setTimeout(() => {
      fetchSuggestions(trimmedTerm);
    }, DEBOUNCE_DELAY);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, fetchSuggestions]);
  
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
    // Don't navigate if it's a placeholder message
    if (suggestion.isPlaceholder) {
      setShowSuggestions(false);
      return;
    }
    
    setShowSuggestions(false);
    setSearchTerm(''); // Clear search term after navigation
    
    try {
      if (suggestion.type === 'product') {
        router.push(`/products/${suggestion.id}`);
      } else if (suggestion.type === 'category') {
        router.push(`/products/category/${suggestion.id}`);
      } else if (suggestion.type === 'vendor') {
        router.push(`/vendors/${suggestion.id}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Optionally show an error message to the user
      setSuggestions([{
        id: 'error',
        type: 'product',
        name: 'Error loading content',
        secondaryText: 'Please try again later'
      }]);
      setShowSuggestions(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm) {
      setShowSuggestions(false);
      // Only navigate if there are actual search results
      if (suggestions.length > 0) {
        router.push(`/search?q=${encodeURIComponent(trimmedTerm)}`);
      } else {
        // Show a message that no results were found
        setSuggestions([{
          id: 'no-results',
          type: 'product',
          name: 'No matching products found',
          secondaryText: 'Try different keywords'
        }]);
        setShowSuggestions(true);
      }
      setSearchTerm('');
    }
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

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Input
          placeholder="Search for products, brands and categories"
          className="h-10 pr-12 rounded-full border-2 border-primary/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200 text-foreground"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.trim() === '') {
              setShowSuggestions(false);
            }
          }}
          onFocus={handleInputFocus}
          aria-label="Search products and categories"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 flex items-center justify-center">
          {isLoading ? (
            <Spinner size="sm" className="text-muted-foreground" />
          ) : (
            <Button 
              type="submit" 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-transparent" 
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </form>
      
      {showSuggestions && (
        <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-lg shadow-xl z-50 max-h-[32rem] overflow-y-auto">
          {suggestions.length > 0 ? (
            <ul className="divide-y divide-muted-foreground">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`group flex items-center gap-3 p-2 ${
                    suggestion.isPlaceholder
                      ? 'cursor-default text-muted-foreground text-sm py-3 px-4' 
                      : 'hover:bg-accent/50 cursor-pointer transition-colors duration-150 rounded-md'
                  }`}
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
          ) : (
            isLoading ? (
              <div className="p-4 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : searchTerm.trim() ? (
              <div className="p-4 text-center text-muted-foreground">
                No results found for "{searchTerm}"
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
