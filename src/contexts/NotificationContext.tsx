
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserContext';
import { differenceInDays } from 'date-fns';
import { usePathname } from 'next/navigation';

type NotificationType = 'subscription' | 'inventory' | 'order' | 'admin';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  notificationCount: number;
  isLoadingNotifications: boolean;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const { currentUser, loadingUser } = useUser();
  const pathname = usePathname(); // Get the current path to trigger refetches

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'vendor') {
      setNotifications([]);
      setIsLoadingNotifications(false);
      return;
    }

    setIsLoadingNotifications(true);
    try {
      const fetchedNotifications: Notification[] = [];
      
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, subscription_end_date, updated_at')
        .eq('user_id', currentUser.id)
        .single();

      if (vendorError || !vendorData) {
        setNotifications([]);
        setIsLoadingNotifications(false);
        return;
      }
      const vendorId = vendorData.id;

      if (vendorData.subscription_end_date) {
        const endDate = new Date(vendorData.subscription_end_date);
        const now = new Date();
        const daysRemaining = differenceInDays(endDate, now);
        if (daysRemaining >= 0 && daysRemaining <= 14) {
          fetchedNotifications.push({
            id: 'sub_expiry_warning',
            type: 'subscription',
            title: 'Subscription Expiring Soon',
            message: `Your vendor subscription will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
            createdAt: vendorData.updated_at || new Date().toISOString(),
          });
        }
      }
      
      const { data: lowStockData } = await supabase
          .from('products')
          .select('id, name, stock, updated_at')
          .eq('vendor_id', vendorId)
          .lte('stock', 5);

      lowStockData?.forEach(product => {
        fetchedNotifications.push({
          id: `low_stock_${product.id}`,
          type: 'inventory',
          title: 'Low Stock Alert',
          message: `Your product "${product.name}" is running low (${product.stock} units left).`,
          createdAt: product.updated_at || new Date().toISOString(),
        });
      });
      
      const { data: adminNotifications, error: adminError } = await supabase
        .from('admin_notifications')
        .select('id, title, message, created_at, is_read')
        .eq('vendor_id', vendorId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if(adminError) {
        console.error("Failed to fetch admin notifications:", adminError);
      } else if (adminNotifications) {
        adminNotifications.forEach(msg => {
            fetchedNotifications.push({
                id: `admin_msg_${msg.id}`,
                type: 'admin',
                title: msg.title,
                message: msg.message,
                createdAt: msg.created_at,
            });
        });

        if (pathname.startsWith('/vendor/notifications') && adminNotifications.length > 0) {
            const unreadIds = adminNotifications.map(msg => msg.id);
            if (unreadIds.length > 0) {
                supabase
                    .from('admin_notifications')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .in('id', unreadIds)
                    .then(({ error: updateError }) => {
                        if (updateError) console.error("Failed to mark notifications as read:", updateError);
                    });
            }
        }
      }

      fetchedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(fetchedNotifications);

    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentUser, pathname]);

  useEffect(() => {
    if (!loadingUser) {
      fetchNotifications();
    }
  }, [loadingUser, fetchNotifications, pathname]);

  return (
    <NotificationContext.Provider
      value={{ notifications, notificationCount: notifications.length, isLoadingNotifications, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
