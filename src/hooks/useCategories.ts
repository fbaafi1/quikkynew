import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/lib/types';

interface CategoryTree extends Category {
  subcategories: CategoryTree[];
}

// Query keys for React Query
export const categoryKeys = {
  all: ['categories'] as const,
  visible: () => [...categoryKeys.all, 'visible'] as const,
  tree: () => [...categoryKeys.visible(), 'tree'] as const,
} as const;

// Optimized tree building function using Map for O(1) lookups
const buildCategoryTree = (categories: Category[]): CategoryTree[] => {
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

// Fetch function for categories
const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_visible', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
};

// Hook for fetching categories with React Query
export const useCategories = () => {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: categoryKeys.visible(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Build category tree from flat categories
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

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

  // Function to invalidate categories cache
  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  };

  return {
    categoryTree,
    flatCategories: getFlatCategories,
    isLoading,
    error: error?.message || null,
    findCategoryById,
    refetch,
    invalidateCategories
  };
};

// Hook for getting just the category tree (cached)
export const useCategoryTree = () => {
  const { categoryTree, isLoading, error } = useCategories();
  return { categoryTree, isLoading, error };
};

// Hook for getting flat categories list
export const useFlatCategories = () => {
  const { flatCategories, isLoading, error } = useCategories();
  return { flatCategories, isLoading, error };
};
