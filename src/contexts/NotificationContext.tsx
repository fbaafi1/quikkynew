"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserContext';
import { differenceInDays } from 'date-fns';
import { usePathname } from 'next/navigation';

type NotificationType = 'subscription' | 'inventory' | 'order' | 'admin' | 'boost';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  data?: Record<string, any>;
  readAt?: string | null;
}

export interface MarkAsReadResponse {
  success: boolean;
  isSystemNotification?: boolean;
  notificationId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  notificationCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<MarkAsReadResponse>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useUser();
  const pathname = usePathname();
  
  const READ_NOTIFICATIONS_KEY = 'quikky_read_notifications';

  const getReadNotificationIds = useCallback((): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const read = localStorage.getItem(READ_NOTIFICATIONS_KEY);
      return new Set(read ? JSON.parse(read) : []);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return new Set();
    }
  }, []);

  const markNotificationAsReadInStorage = useCallback((id: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const readIds = getReadNotificationIds();
      readIds.add(id);
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(Array.from(readIds)));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [getReadNotificationIds]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    const fetchedNotifications: Notification[] = [];
    const readNotificationIds = getReadNotificationIds();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper function to check if a notification should be shown
    const shouldShowNotification = (notification: any) => {
      // Filter out notifications that were read more than 24 hours ago
      if (notification.isRead && notification.readAt) {
        const readTime = new Date(notification.readAt);
        return readTime > twentyFourHoursAgo;
      }
      return true; // Keep unread notifications and notifications without readAt
    };

    try {
      // Fetch from API for database-stored notifications
      const response = await fetch('/api/vendor/notifications');
      if (response.ok) {
        const data = await response.json();
        fetchedNotifications.push(...data
          .filter(shouldShowNotification)
          .filter((n: any) => !readNotificationIds.has(n.id))
          .map((n: any) => ({
            id: n.id,
            type: n.type as NotificationType,
            title: n.title,
            message: n.message,
            createdAt: n.created_at || new Date().toISOString(),
            isRead: n.is_read || false,
            readAt: n.read_at || null,
            data: n.data || null,
          }))
        );
      }

      // Generate in-memory boost notifications
      if (currentUser) {
        try {
          const { data: boostRequests, error } = await supabase
            .from('boost_requests')
            .select('*')
            .eq('user_id', currentUser.id);

          if (!error && boostRequests) {
            // Group requests by status for better messaging
            const pendingRequests = boostRequests.filter(r => r.request_status === 'pending');
            const approvedRequests = boostRequests.filter(r => r.request_status === 'approved');
            const rejectedRequests = boostRequests.filter(r => r.request_status === 'rejected');

            // Add boost status notifications
            if (pendingRequests.length > 0) {
              fetchedNotifications.push({
                id: `boost_pending_${currentUser.id}`,
                type: 'boost',
                title: '⏳ Boost Requests Pending',
                message: `You have ${pendingRequests.length} boost request${pendingRequests.length > 1 ? 's' : ''} awaiting review.`,
                createdAt: new Date().toISOString(),
                isRead: readNotificationIds.has(`boost_pending_${currentUser.id}`),
                readAt: null,
              });
            }

            if (approvedRequests.length > 0) {
              const latestApproved = approvedRequests.sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )[0];

              fetchedNotifications.push({
                id: `boost_approved_${latestApproved.id}`,
                type: 'boost',
                title: '🎉 Boost Request Approved!',
                message: `Great news! Your boost request has been approved for ${latestApproved.plan_duration_days} days.`,
                createdAt: latestApproved.updated_at,
                isRead: readNotificationIds.has(`boost_approved_${latestApproved.id}`),
                readAt: null,
                data: {
                  boostRequestId: latestApproved.id,
                  productId: latestApproved.product_id,
                  status: 'approved',
                },
              });
            }

            if (rejectedRequests.length > 0) {
              const latestRejected = rejectedRequests.sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )[0];

              fetchedNotifications.push({
                id: `boost_rejected_${latestRejected.id}`,
                type: 'boost',
                title: '❌ Boost Request Rejected',
                message: `Your boost request has been rejected. Please contact support if you have questions.`,
                createdAt: latestRejected.updated_at,
                isRead: readNotificationIds.has(`boost_rejected_${latestRejected.id}`),
                readAt: null,
                data: {
                  boostRequestId: latestRejected.id,
                  productId: latestRejected.product_id,
                  status: 'rejected',
                },
              });
            }
          }
        } catch (boostError) {
          console.error('Error fetching boost requests for notifications:', boostError);
          // Don't fail the entire notification fetch if boost requests fail
        }
      }

      // Filter out in-memory notifications that were read more than 24 hours ago
      const filteredNotifications = fetchedNotifications.filter(shouldShowNotification);

      filteredNotifications.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<MarkAsReadResponse> => {
    if (!notificationId) {
      return { success: false };
    }

    const isSystemNotification = [
      'sub_', 'system_', 'expiry_', 'warning_', 'info_', 'low_stock_', 'boost_'
    ].some(prefix => notificationId.startsWith(prefix));

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
    );

    markNotificationAsReadInStorage(notificationId);

    if (!isSystemNotification) {
      try {
        const response = await fetch(`/api/vendor/notifications/${encodeURIComponent(notificationId)}/read`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }
        
        return { success: true, notificationId };
      } catch (error) {
        console.error('Error marking notification as read:', error);
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: false, readAt: null } : n)
        );
        return { success: false, notificationId };
      }
    }

    return { success: true, isSystemNotification: true, notificationId };
  }, [markNotificationAsReadInStorage]);

  const notificationCount = useMemo(() => {
    const readIds = getReadNotificationIds();
    return notifications.filter(n => !n.isRead && !readIds.has(n.id)).length;
  }, [notifications, getReadNotificationIds]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, pathname]);

  const contextValue = useMemo(() => ({
    notifications,
    notificationCount,
    isLoading,
    fetchNotifications,
    markNotificationAsRead
  }), [notifications, notificationCount, isLoading, fetchNotifications, markNotificationAsRead]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
