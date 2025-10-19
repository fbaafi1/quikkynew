"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import type { Vendor, User } from "@/lib/types";
import { ChevronsUpDown, Check, Send, AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser } from "@/contexts/UserContext";
import { Spinner } from "@/components/ui/spinner";

const notificationFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  message: z.string().min(10, "Message must be at least 10 characters."),
  sendTo: z.enum(["all", "single"]),
  vendorId: z.string().optional(),
}).refine(data => {
    if (data.sendTo === "single" && !data.vendorId) {
        return false;
    }
    return true;
}, {
    message: "You must select a specific vendor.",
    path: ["vendorId"],
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { currentUser, loadingUser } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [vendors, setVendors] = useState<Pick<Vendor, 'id' | 'store_name'>[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth Guard Effect
  useEffect(() => {
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
        router.push('/auth/login?redirect=/admin/notifications');
    }
  }, [currentUser, loadingUser, router]);

  useEffect(() => {
    // Fetch vendors only if user is an admin
    if (currentUser?.role === 'admin') {
        const fetchVendors = async () => {
            setIsLoadingVendors(true);
            try {
                const { data, error } = await supabase.from('vendors').select('id, store_name').order('store_name');
                if (error) throw error;
                setVendors(data || []);
            } catch (error: any) {
                console.error("Failed to fetch vendors:", error.message);
            } finally {
                setIsLoadingVendors(false);
            }
        }
        fetchVendors();
    }
  }, [currentUser]);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
        title: "",
        message: "",
        sendTo: "all",
    },
  });
  
  const sendToValue = form.watch("sendTo");

  async function onSubmit(values: NotificationFormValues) {
    setIsLoading(true);

    try {
        let notificationsToInsert: Omit<any, 'id' | 'created_at' | 'is_read'>[] = [];
        let successMessage = '';

        if (values.sendTo === 'all') {
            const { data: allVendors, error: vendorError } = await supabase.from('vendors').select('id');
            if (vendorError) throw vendorError;
            if (!allVendors || allVendors.length === 0) {
                console.error('No Vendors Found', 'There are no vendors to send notifications to.');
                setIsLoading(false);
                return;
            }
            notificationsToInsert = allVendors.map((vendor: any) => ({
                vendor_id: vendor.id,
                title: values.title,
                message: values.message,
            }));
            successMessage = `Notification successfully sent to all ${allVendors.length} vendors.`;

        } else { // Single vendor
            notificationsToInsert.push({
                vendor_id: values.vendorId,
                title: values.title,
                message: values.message,
            });
            successMessage = 'Notification successfully sent to the selected vendor.';
        }

        const { error: insertError } = await supabase.from('admin_notifications').insert(notificationsToInsert as any);

        if (insertError) {
            // Check for RLS violation error
            if (insertError.code === '42501') {
                throw new Error("Permission Denied. Ensure you are logged in as an admin and the RLS policy is in place.");
            }
            throw insertError;
        }

        console.log("Notification Sent", successMessage);
        form.reset();
        
    } catch (error: any) {
        console.error("Error sending notification:", error);
    } finally {
        setIsLoading(false);
    }
  }

  // Loading and Access Denied states
  if (!isClient || loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
     return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Send Notification to Vendors</CardTitle>
          <CardDescription>
            Compose a message and send it to all vendors or a specific one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title / Subject</FormLabel>
                    <FormControl><Input placeholder="e.g., Important Platform Update" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea placeholder="Your detailed message to the vendors..." {...field} rows={5} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sendTo"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Send To</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="all" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            All Vendors
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="single" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Select a single vendor
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {sendToValue === 'single' && (
                  <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                          <FormLabel>Select Vendor</FormLabel>
                          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                  disabled={isLoadingVendors}
                                  >
                                  {isLoadingVendors ? <Spinner className="mr-2 h-4 w-4"/> : null}
                                  {field.value
                                    ? vendors.find((v: any) => v.id === field.value)?.store_name
                                    : "Select a vendor..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search vendors..." />
                                  <CommandList>
                                  <CommandEmpty>No vendor found.</CommandEmpty>
                                  <CommandGroup>
                                      {vendors.map((vendor) => (
                                      <CommandItem
                                          value={vendor.store_name}
                                          key={vendor.id}
                                          onSelect={() => {
                                              form.setValue("vendorId", vendor.id);
                                              setComboboxOpen(false);
                                          }}
                                      >
                                          <Check className={cn("mr-2 h-4 w-4", vendor.id === field.value ? "opacity-100" : "opacity-0")} />
                                          {vendor.store_name}
                                      </CommandItem>
                                      ))}
                                  </CommandGroup>
                                  </CommandList>
                              </Command>
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
              )}

              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                Send Notification
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Notifications Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Notifications</CardTitle>
          <CardDescription>
            View and delete sent notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsManager />
        </CardContent>
      </Card>
    </div>
  );
}

// Separate component for notifications management
function NotificationsManager() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`
          id,
          title,
          message,
          created_at,
          vendor_id,
          vendors!inner(store_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group notifications by title and message (broadcasts)
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const key = `${notification.title}-${notification.message}`;
    if (!acc[key]) {
      acc[key] = {
        ...notification,
        vendorCount: 1,
        vendorNames: [notification.vendors?.store_name].filter(Boolean),
        notificationIds: [notification.id] // Track all IDs in this group
      } as any;
    } else {
      acc[key].vendorCount += 1;
      acc[key].vendorNames.push(notification.vendors?.store_name);
      acc[key].notificationIds.push(notification.id);
    }
    return acc;
  }, {} as Record<string, any>);

  const displayNotifications = Object.values(groupedNotifications);

  const handleDeleteNotification = async (notificationIds: string[]) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    setDeletingId(notificationIds[0]); // Use first ID for loading state
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .in('id', notificationIds);

      if (error) throw error;

      // Remove from local state
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      console.log('Notification(s) deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  if (displayNotifications.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No notifications sent yet.</p>;
  }

  return (
    <div className="space-y-4">
      {displayNotifications.map((notification: any) => (
        <Card key={`${notification.title}-${notification.message}`} className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Sent: {new Date(notification.created_at).toLocaleDateString()}
                </span>
                <span>
                  To: {notification.vendorCount > 1
                    ? `All Vendors (${notification.vendorCount} recipients)`
                    : (notification.vendors?.store_name || 'Unknown Vendor')
                  }
                </span>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteNotification(notification.notificationIds)}
              disabled={deletingId === notification.notificationIds?.[0]}
            >
              {deletingId === notification.notificationIds?.[0] ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
