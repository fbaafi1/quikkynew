import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/lib/types';

interface CategoryTree extends Category {
  subcategories: CategoryTree[];
}

// Fallback hook without React Query for compatibility
export const useCategoriesFallback = () => {
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimized tree building function using Map for O(1) lookups
  const buildCategoryTree = useMemo(() => {
    return (categories: Category[]): CategoryTree[] => {
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
        const categoryNode = categoryMap.get(category.id)!;
        if (category.parent_id === null) {
          rootCategories.push(categoryNode);
        } else {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.subcategories.push(categoryNode);
          }
        }
      });

      return rootCategories;
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_visible', true)
          .order('name', { ascending: true });

        if (error) {
          throw new Error(`Failed to fetch categories: ${error.message}`);
        }

        const tree = buildCategoryTree(data || []);
        setCategoryTree(tree);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error("Error fetching categories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [buildCategoryTree]);

  // Helper function to get flat list of categories
  const getFlatCategories = useMemo(() => {
    const flatten = (categories: CategoryTree[]): Category[] => {
      const result: Category[] = [];
      categories.forEach(category => {
        result.push(category);
        if (category.subcategories.length > 0) {
          result.push(...flatten(category.subcategories));
        }
      });
      return result;
    };
    return flatten(categoryTree);
  }, [categoryTree]);

  // Helper function to find category by ID
  const findCategoryById = useMemo(() => {
    return (id: string): CategoryTree | null => {
      const findInTree = (categories: CategoryTree[]): CategoryTree | null => {
        for (const category of categories) {
          if (category.id === id) return category;
          const found = findInTree(category.subcategories);
          if (found) return found;
        }
        return null;
      };
      return findInTree(categoryTree);
    };
  }, [categoryTree]);

  return {
    categoryTree,
    flatCategories: getFlatCategories,
    isLoading,
    error,
    findCategoryById,
    refetch: () => {
      // Trigger re-fetch by updating a dependency
      setCategoryTree([]);
    }
  };
};
