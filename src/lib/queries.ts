import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// Query Keys
export const queryKeys = {
  products: ['products'] as const,
  categories: ['categories'] as const,
  vendors: ['vendors'] as const,
  boostPlans: ['boostPlans'] as const,
  boostRequests: ['boostRequests'] as const,
  notifications: ['notifications'] as const,
  orders: ['orders'] as const,
};

// Products Queries
export const useProducts = (vendorId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.products, vendorId],
    queryFn: async () => {
      const query = supabase
        .from('products')
        .select('id, name, price, images, category_id, average_rating, review_count') // Reduced fields
        .order('created_at', { ascending: false });

      if (vendorId) {
        query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query.limit(50); // Limit to 50 products max
      if (error) throw error;

      return data?.map((p: any) => ({
        ...p,
        categoryId: p.category_id,
        categoryName: p.categories?.name || 'N/A',
      })) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

// Vendors Query
export const useVendors = () => {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, store_name, description, is_verified')
        .eq('is_verified', true)
        .order('store_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Categories Query
export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Boost Plans Query
export const useBoostPlans = () => {
  return useQuery({
    queryKey: queryKeys.boostPlans,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boost_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Boost Requests Query
export const useBoostRequests = () => {
  return useQuery({
    queryKey: queryKeys.boostRequests,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boost_requests')
        .select(`
          *,
          products:product_id (
            id,
            name,
            images
          ),
          vendors:vendor_id (
            id,
            store_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Notifications Query (for current user)
export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const response = await fetch('/api/vendor/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Mutation for updating boost request status
export const useUpdateBoostRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: 'pending' | 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('boost_requests')
        .update({ request_status: status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      return { requestId, status };
    },
    onSuccess: () => {
      // Invalidate and refetch boost requests
      queryClient.invalidateQueries({ queryKey: queryKeys.boostRequests });
    },
  });
};

// Mutation for marking notification as read
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/vendor/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate notifications to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};
