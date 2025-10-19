"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Edit,
  Eye,
  Search,
  Trash2,
  AlertTriangle,
  Rocket,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import type { Product, Category, Vendor, BoostPlan } from '@/lib/types';
import { format } from 'date-fns';
import { BoostProductDialog } from './BoostProductDialog';
import { useProducts, useCategories, useBoostPlans } from '@/lib/queries';
import { TableSkeleton, CardSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface VendorProductsClientProps {
  // Remove props since we'll fetch data with React Query
}

export default function VendorProductsClient({}: VendorProductsClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string} | null>(null);

  // Use React Query for data fetching
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: boostPlans = [], isLoading: boostPlansLoading } = useBoostPlans();

  const handleBoostRequested = useCallback(() => {
    router.refresh(); // Refresh to show updated boost status
  }, [router]);

  const handleBoostClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct({ id: product.id, name: product.name });
    setBoostDialogOpen(true);
  };

  // Filter products based on search and filters
  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;

    const matchesStock = stockFilter === 'all' ||
                        (stockFilter === 'low' && product.stock <= 5) ||
                        (stockFilter === 'out' && product.stock === 0) ||
                        (stockFilter === 'in-stock' && product.stock > 5);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const getStockBadgeVariant = (stock: number) => {
    if (stock === 0) return 'destructive';
    if (stock <= 5) return 'secondary';
    return 'default';
  };

  const getStockBadgeText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 5) return 'Low Stock';
    return 'In Stock';
  };

  const isProductBoosted = (product: Product) => {
    return product.is_boosted && product.boosted_until && new Date(product.boosted_until) > new Date();
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/vendor/products/${productToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      toast.success('Product deleted successfully');
      router.refresh(); // Refresh the page to update the product list
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const lowStockProducts = (products || []).filter(p => p.stock <= 5 && p.stock > 0);
  const outOfStockProducts = (products || []).filter(p => p.stock === 0);
  const boostedProducts = (products || []).filter(isProductBoosted);

  // Show loading state
  if (productsLoading || categoriesLoading || boostPlansLoading) {
    return (
      <div className="space-y-4 md:space-y-6 w-full overflow-x-hidden">
        {/* Loading skeleton for stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Loading skeleton for main content */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <div className="space-y-1">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 sm:mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (productsError) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-destructive">Failed to Load Products</CardTitle>
          <CardDescription>
            We couldn't load your products. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4 md:space-y-6 w-full overflow-x-hidden">
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this product and all its data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedProduct && boostPlans && (
          <BoostProductDialog
            open={boostDialogOpen}
            onOpenChange={setBoostDialogOpen}
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            boostPlans={boostPlans}
            onBoostRequested={handleBoostRequested}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boosted</CardTitle>
              <Rocket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{boostedProducts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-xl">Product Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage your product inventory and boost requests
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 sm:mb-6">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base w-full"
                  />
                </div>
              </div>
              <div className="sm:col-span-1">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="text-xs sm:text-sm">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1">
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="All Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Stock</SelectItem>
                    <SelectItem value="low" className="text-xs sm:text-sm">Low Stock</SelectItem>
                    <SelectItem value="out" className="text-xs sm:text-sm">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Table */}
            <div className="rounded-md border w-full">
              <div className="w-full">
                <Table className="w-full">
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hidden sm:table-row">
                      <TableHead className="w-[35%] lg:w-[30%]">Product</TableHead>
                      <TableHead className="hidden sm:table-cell w-[15%]">Category</TableHead>
                      <TableHead className="w-[15%] text-right">Price</TableHead>
                      <TableHead className="hidden sm:table-cell w-[10%]">Stock</TableHead>
                      <TableHead className="hidden md:table-cell w-[15%]">Status</TableHead>
                      <TableHead className="w-[10%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="sm:divide-y">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id} className="group flex flex-col sm:table-row border-b sm:border-b-0 hover:bg-muted/20">
                          <TableCell className="py-3 sm:py-2">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0].split('" data-ai-hint="')[0]}
                                    alt={product.name}
                                    className="h-12 w-12 sm:h-10 sm:w-10 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 sm:h-10 sm:w-10 rounded-md bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="font-medium text-sm sm:text-base truncate max-w-full">{product.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-full">
                                  {product.description}
                                </div>
                                <div className="sm:hidden mt-1.5 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="outline" className="text-xs truncate max-w-[60%]">
                                    </Badge>
                                    <span className="text-sm font-medium whitespace-nowrap">GH₵{product.price.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant={getStockBadgeVariant(product.stock)} className="text-xs truncate max-w-[60%]">
                                      {product.stock} units • {getStockBadgeText(product.stock)}
                                    </Badge>
                                    <div className="flex-shrink-0 flex space-x-1">
                                      {product.boost_status === 'active' ? (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 flex-shrink-0 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                                          title="Boosted"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const endDate = product.boosted_until ? new Date(product.boosted_until) : null;
                                            const formattedDate = endDate ? format(endDate, 'MMM d, yyyy') : 'soon';
                                            toast.info(`This product is boosted until ${formattedDate}`);
                                          }}
                                        >
                                          <Rocket className="h-3.5 w-3.5" />
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 flex-shrink-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                          title="Boost Product"
                                          onClick={(e) => handleBoostClick(e, product)}
                                        >
                                          <Rocket className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" asChild>
                                        <Link href={`/vendor/products/${product.id}/edit`} title="Edit">
                                          <Edit className="h-3.5 w-3.5" />
                                        </Link>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDeleteClick(product.id);
                                        }}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  {isProductBoosted(product) && (
                                    <Badge variant="default" className="text-xs w-fit">
                                      <Rocket className="mr-1 h-3 w-3" />
                                      Boosted
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-xs sm:text-sm">
                              {product.categoryName || 'Uncategorized'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-medium whitespace-nowrap">
                            <span className="text-sm sm:text-base">GH₵{product.price.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={getStockBadgeVariant(product.stock)} className="text-xs sm:text-sm">
                              {product.stock} units
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <Badge variant={getStockBadgeVariant(product.stock)} className="text-xs sm:text-sm">
                                {getStockBadgeText(product.stock)}
                              </Badge>
                              {isProductBoosted(product) && (
                                <Badge variant="default" className="text-xs w-fit">
                                  <Rocket className="mr-1 h-3 w-3" />
                                  Boosted
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              {product.boost_status === 'active' ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                                  title="Boosted"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const endDate = product.boosted_until ? new Date(product.boosted_until) : null;
                                    const formattedDate = endDate ? format(endDate, 'MMM d, yyyy') : 'soon';
                                    toast.info(`This product is boosted until ${formattedDate}`);
                                  }}
                                >
                                  <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                  title="Boost Product"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleBoostClick(e, product);
                                  }}
                                >
                                  <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
                                <Link href={`/vendor/products/${product.id}/edit`} title="Edit Product">
                                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteClick(product.id);
                                }}
                                title="Delete Product"
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
                                ? 'No products match your filters'
                                : 'No products found. Add your first product to get started.'}
                            </p>
                            {!searchTerm && categoryFilter === 'all' && stockFilter === 'all' && (
                              <Button asChild>
                                <Link href="/vendor/products/new">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Product
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
