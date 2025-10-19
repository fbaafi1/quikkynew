"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Grid, List, Package, AlertCircle, RefreshCw } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { useProducts, useCategories } from '@/lib/queries';
import type { Product, Category } from '@/lib/types';

interface ProductsClientProps {
  initialQuery: string;
  initialCategory: string;
  initialPage: number;
}

export default function ProductsClient({ initialQuery, initialCategory, initialPage }: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 20;

  // Fetch data
  const { data: allProducts = [], isLoading: productsLoading, error: productsError, refetch } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const isLoading = productsLoading || categoriesLoading;
  const hasError = productsError;

  // Filter and sort products based on search criteria (for current page)
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Apply search query filter - search in name AND description
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'relevance':
      default:
        // For relevance, prioritize products where search term appears in name
        if (searchQuery.trim()) {
          const searchTerm = searchQuery.toLowerCase();
          filtered.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(searchTerm) ? 1 : 0;
            const bNameMatch = b.name.toLowerCase().includes(searchTerm) ? 1 : 0;
            const aDescMatch = a.description && a.description.toLowerCase().includes(searchTerm) ? 0.5 : 0;
            const bDescMatch = b.description && b.description.toLowerCase().includes(searchTerm) ? 0.5 : 0;

            const aScore = aNameMatch + aDescMatch;
            const bScore = bNameMatch + bDescMatch;

            return bScore - aScore;
          });
        }
        break;
    }

    return filtered;
  }, [allProducts, searchQuery, selectedCategory, sortBy]);

  // Get products for current page
  const currentPageProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  // Update displayed products when current page changes
  useEffect(() => {
    if (currentPageProducts.length > 0) {
      setDisplayedProducts(currentPageProducts);
    }
  }, [currentPageProducts]);

  // Load more products
  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);

    const newUrl = `/products?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      router.replace(newUrl, { scroll: false });
    }

    // Reset pagination when filters change
    setCurrentPage(1);
    setDisplayedProducts([]);
  }, [searchQuery, selectedCategory, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      setSearchQuery(trimmedQuery);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('relevance');
    router.push('/products');
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Products</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          We couldn't load the products. Please try again.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            {isLoading ? (
              'Loading products...'
            ) : (
              <>
                {filteredProducts.length === 0 ? (
                  'No products found'
                ) : (
                  `Showing ${displayedProducts.length} of ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`
                )}
                {searchQuery && ` for "${searchQuery}"`}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                <div className="h-6 w-1/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredProducts.length === 0 && searchQuery && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't find any products matching your search for "{searchQuery}".
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Try searching for:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      {!isLoading && displayedProducts.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-4'
        }>
          {displayedProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!isLoading && displayedProducts.length > 0 && displayedProducts.length < filteredProducts.length && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            size="lg"
            className="min-w-48"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More Products (${filteredProducts.length - displayedProducts.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
