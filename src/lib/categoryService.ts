import { supabase } from './supabaseClient';
import type { Category } from './types';
import { AppError, handleAsync } from './errorUtils';

interface CategoryTree extends Category {
  subcategories: CategoryTree[];
}

// Server-side category service for better performance
export class CategoryService {
  private static cache: Map<string, { data: CategoryTree[]; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Optimized tree building function using Map for O(1) lookups
  private static buildCategoryTree(categories: Category[]): CategoryTree[] {
    const categoryMap = new Map<string, CategoryTree>();
    const rootCategories: CategoryTree[] = [];

    // First pass: create all category nodes
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        subcategories: []
      });
    });

    // Second pass: build the tree structure
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      if (!categoryNode) return; // Skip if category node not found
      
      if (!category.parent_id) {
        rootCategories.push(categoryNode);
      } else {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.subcategories.push(categoryNode);
        }
      }
    });

    return rootCategories;
  }

  // Get categories with caching and error handling
  static async getVisibleCategories(): Promise<Category[]> {
    const query = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_visible', true)
        .order('name', { ascending: true });
      return { data, error };
    };

    const { data, error } = await handleAsync<Category[]>(
      query(),
      'Failed to fetch categories',
      500,
      'CATEGORIES_FETCH_ERROR'
    );

    if (error) {
      throw new AppError(
        error.message,
        error.statusCode || 500,
        error.code,
        process.env.NODE_ENV === 'development' ? error.details : undefined
      );
    }

    return data || [];
  }

  // Get category tree with caching and error handling
  static async getCategoryTree(): Promise<CategoryTree[]> {
    try {
      const cacheKey = 'category_tree';
      const now = Date.now();
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        return cached.data;
      }

      // Fetch from database with error handling
      const categories = await this.getVisibleCategories();
      const tree = this.buildCategoryTree(categories);

      // Update cache
      this.cache.set(cacheKey, { data: tree, timestamp: now });

      return tree;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to build category tree',
        500,
        'CATEGORY_TREE_ERROR',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  }

  // Get flat categories list
  static async getFlatCategories(): Promise<Category[]> {
    return this.getVisibleCategories();
  }

  // Find category by ID with error handling
  static async findCategoryById(id: string): Promise<CategoryTree | null> {
    try {
      if (!id) {
        throw new AppError('Category ID is required', 400, 'INVALID_CATEGORY_ID');
      }
      
      const tree = await this.getCategoryTree();
      
      const findInTree = (categories: CategoryTree[]): CategoryTree | null => {
        for (const category of categories) {
          if (category.id === id) return category;
          const found = findInTree(category.subcategories);
          if (found) return found;
        }
        return null;
      };

      return findInTree(tree);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to find category',
        500,
        'CATEGORY_NOT_FOUND',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  }

  // Invalidate cache (call this when categories are updated)
  static invalidateCache(): void {
    this.cache.clear();
  }

  // Get category with products count
  static async getCategoryWithProductCount(categoryId: string): Promise<{
    category: Category | null;
    productCount: number;
  }> {
    const [categoryResult, productCountResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single(),
      supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('category_id', categoryId)
    ]);

    return {
      category: categoryResult.data,
      productCount: productCountResult.count || 0
    };
  }
}
