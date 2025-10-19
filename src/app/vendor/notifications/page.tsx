'use client';

import { Bell, AlertTriangle, Package, ShoppingCart, MessageSquare, ChevronLeft, ChevronRight, Check, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications, Notification, MarkAsReadResponse } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';


const ITEMS_PER_PAGE = 10;

const getNotificationIcon = (type: Notification['type']): JSX.Element => {
    switch (type) {
        case 'subscription':
            return <AlertTriangle className="h-5 w-5 text-destructive" />;
        case 'inventory':
            return <Package className="h-5 w-5 text-yellow-600" />;
        case 'order':
            return <ShoppingCart className="h-5 w-5 text-green-600" />;
        case 'admin':
            return <MessageSquare className="h-5 w-5 text-blue-600" />;
        case 'boost':
            return <Star className="h-5 w-5 text-purple-600" />;
        default:
            return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
};

export default function VendorNotificationsPage() {
    const { 
        notifications, 
        isLoading, 
        markNotificationAsRead,
        notificationCount 
    } = useNotifications();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

    const handleMarkAsRead = async (notificationId: string) => {
        if (!notificationId) {
            toast.error('No notification ID provided');
            return;
        }

        try {
            setMarkingAsRead(notificationId);
            
            const result = await markNotificationAsRead(notificationId);
            
            if (result?.isSystemNotification) {
                toast.success('Notification dismissed');
            } else {
                toast.success('Marked as read');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update notification';
            
            // Only show error toast for non-system notifications
            if (!notificationId.startsWith('sub_') && 
                !notificationId.startsWith('system_') &&
                !notificationId.startsWith('expiry_') &&
                !notificationId.startsWith('warning_') &&
                !notificationId.startsWith('info_')) {
                toast.error('Failed to mark notification as read');
            }
        } finally {
            setMarkingAsRead(null);
        }
    };

    const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = notifications.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Spinner className="h-12 w-12 text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading notifications...</p>
            </div>
        );
    }

  const renderNotificationMessage = (notification: Notification) => {
    if (notification.type === 'inventory' && notification.id.startsWith('low_stock_')) {
      const productId = notification.id.replace('low_stock_', '');
      // For inventory notifications, the message might contain product names in quotes
      const message = notification.message || '';
      const messageParts = message.match(/".*?"/);
      
      if (messageParts && messageParts.length > 1) {
        const productName = messageParts[0].replace(/"/g, '');
        const restOfMessage = message.substring(message.indexOf(`" is`) + 1);
        return (
          <p className="text-sm text-muted-foreground">
            Your product{' '}
            <Link 
              href={`/vendor/products/${productId}/edit`} 
              className="font-semibold text-foreground hover:underline"
            >
              {productName}
            </Link>
            {restOfMessage}
          </p>
        );
      }
    }
    
    // For all other notification types, just display the message
    return <p className="text-sm text-muted-foreground">{notification.message || 'No message content'}</p>;
  };

  return (
    <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 mb-8">
            <Bell size={30}/> Notifications
        </h1>

        <Card>
            <CardHeader>
                <CardTitle>Your Recent Alerts</CardTitle>
                <CardDescription>All important updates regarding your store will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
                {paginatedNotifications.length > 0 ? (
                    <div className="space-y-4">
                        {paginatedNotifications.map(notification => (
                            <div
                              key={notification.id}
                              className="p-4 border-l-4 flex flex-wrap sm:flex-nowrap items-start justify-between gap-x-4 gap-y-1 rounded-r-md bg-accent/20"
                              style={{
                                borderColor:
                                  notification.type === 'subscription'
                                    ? 'hsl(var(--destructive))'
                                    : notification.type === 'inventory'
                                    ? 'hsl(var(--chart-4))'
                                    : notification.type === 'admin'
                                    ? 'hsl(var(--chart-1))'
                                    : notification.type === 'boost'
                                    ? 'hsl(262, 83%, 58%)' // Purple color for boost notifications
                                    : 'hsl(var(--chart-2))',
                              }}
                            >
                              <div className="flex items-start gap-4 flex-grow min-w-0">
                                <div className="mt-1 shrink-0">{getNotificationIcon(notification.type)}</div>
                                <div className="flex-grow min-w-0">
                                  <p className="font-semibold">{notification.title}</p>
                                  {renderNotificationMessage(notification)}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto">
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                                {!notification.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    disabled={markingAsRead === notification.id}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {markingAsRead === notification.id ? (
                                      <span>Marking...</span>
                                    ) : (
                                      <>
                                        <Check className="h-3 w-3" />
                                        <span>Mark as Read</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Bell className="mx-auto h-12 w-12 mb-4" />
                        <p>You have no notifications right now.</p>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                        Next<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

