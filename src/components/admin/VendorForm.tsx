
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
import { Loader2, Calendar as CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const vendorFormSchema = z.object({
  store_name: z.string().min(3, { message: "Store name must be at least 3 characters." }),
  contact_number: z.string().regex(/^0[235]\d{8}$/, "Enter a valid Ghanaian phone number (e.g., 024xxxxxxx)").optional().or(z.literal('')),
  description: z.string().optional(),
  user_id: z.string({ required_error: "A user must be selected to become a vendor." }),
  is_verified: z.boolean().default(false),
  subscription_start_date: z.date().optional().nullable(),
  subscription_end_date: z.date().optional().nullable(),
}).refine(data => {
    // If both dates are present, end date must be on or after the start date
    if (data.subscription_start_date && data.subscription_end_date) {
        return data.subscription_end_date >= data.subscription_start_date;
    }
    return true; // Pass if one or both dates are not set
}, {
    message: "End date must be on or after start date.",
    path: ["subscription_end_date"], // Show the error on the end date field
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  vendor?: Vendor;
}

export default function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<User[]>([]);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const isEditing = !!vendor;

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      store_name: vendor?.store_name || "",
      contact_number: vendor?.contact_number || "",
      description: vendor?.description || "",
      user_id: vendor?.user_id || "",
      is_verified: vendor?.is_verified || false,
      subscription_start_date: vendor?.subscription_start_date ? new Date(vendor.subscription_start_date) : null,
      subscription_end_date: vendor?.subscription_end_date ? new Date(vendor.subscription_end_date) : null,
    },
  });

  useEffect(() => {
    if (!isEditing) {
      setIsLoadingCustomers(true);
      const fetchAvailableCustomers = async () => {
        try {
          console.log('🔍 Fetching available customers...');

          // Step 1: Get existing vendor user_ids
          const { data: existingVendorUserIds, error: vendorIdsError } = await supabase
            .from('vendors')
            .select('user_id');

          if (vendorIdsError) {
            console.error('❌ Error fetching vendor user_ids:', vendorIdsError);
            throw vendorIdsError;
          }

          console.log('✅ Vendor user_ids fetched:', existingVendorUserIds?.length || 0);

          const vendorUserIds = existingVendorUserIds?.map(v => v.user_id).filter(Boolean) || [];
          console.log('🔍 Vendor user_ids:', vendorUserIds);

          // Step 2: Get all customers
          console.log('🔍 Querying for customers with role: customer');
          const { data: customersData, error: customersError } = await supabase
            .from('user_profiles')
            .select('id, name, email, role')
            .eq('role', 'customer');

          if (customersError) {
            console.error('❌ Error fetching customers:', customersError);
            throw customersError;
          }

          console.log('✅ Customers fetched:', customersData?.length || 0);
          console.log('🔍 First few customers:', customersData?.slice(0, 3) || []);

          if (!customersData || customersData.length === 0) {
            console.warn('⚠️ No customers found with role "customer"');

            // Try alternative: query all profiles and filter manually
            console.log('🔄 Trying alternative query approach...');
            const { data: allProfiles, error: allError } = await supabase
              .from('user_profiles')
              .select('id, name, email, role');

            if (allError) {
              console.error('❌ Alternative query also failed:', allError);
            } else {
              console.log('✅ All profiles fetched:', allProfiles?.length || 0);
              const customerProfiles = allProfiles?.filter(p => p.role === 'customer') || [];
              console.log('✅ Customers found via alternative method:', customerProfiles.length);

              if (customerProfiles.length > 0) {
                console.log('🎯 Found customers using alternative method!');
                // Use the alternative results
                const customersNotYetVendorsAlt = customerProfiles.filter(c => !vendorUserIds.includes(c.id));
                console.log('✅ Available customers (alternative):', customersNotYetVendorsAlt.length);

                setAvailableCustomers(customersNotYetVendorsAlt as User[]);
                setCustomerError(null);
                return;
              }
            }

            setCustomerError('No customers found. Please ensure customers exist with role "customer".');
            setAvailableCustomers([]);
            return;
          }

          // Step 3: Filter out existing vendors
          const customersNotYetVendors = customersData?.filter(c => !vendorUserIds.includes(c.id)) || [];
          console.log('✅ Available customers:', customersNotYetVendors.length);

          setAvailableCustomers(customersNotYetVendors as User[]);
          setCustomerError(null);
        } catch (error: any) {
          console.error('❌ Error fetching customer list:', error);

          let errorMessage = 'Failed to load customers.';

          if (error.message?.includes('relation "user_profiles" does not exist')) {
            errorMessage = 'User profiles table not found. Please contact support.';
          } else if (error.message?.includes('permission denied')) {
            errorMessage = 'Permission denied. Please check database permissions.';
          } else if (error.message?.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = `Failed to load customers: ${error.message || 'Unknown error'}`;
          }

          setCustomerError(errorMessage);
          setAvailableCustomers([]);
        } finally {
          setIsLoadingCustomers(false);
        }
      };
      fetchAvailableCustomers();
    }
  }, [isEditing]);

  async function onSubmit(values: VendorFormValues) {
    setIsLoading(true);

    try {
      if (isEditing) {
        // Handle editing an existing vendor
        const { error } = await supabase
            .from('vendors')
            .update({ 
                store_name: values.store_name,
                contact_number: values.contact_number || null,
                description: values.description || null,
                is_verified: values.is_verified,
                subscription_start_date: values.subscription_start_date?.toISOString() || null,
                subscription_end_date: values.subscription_end_date?.toISOString() || null,
                updated_at: new Date().toISOString() 
            })
            .eq('id', vendor!.id);
        if (error) throw error;
      } else {
        // Handle creating a new vendor
        // Step 1: Update the user's role to vendor FIRST
        // First, let's check the current role
        const { data: currentProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('id, name, email, role')
            .eq('id', values.user_id)
            .single();

        if (profileCheckError) {
            throw new Error(`Failed to check current user profile: ${profileCheckError.message}`);
        }

        if (currentProfile.role === 'vendor') {
            // User is already vendor, skipping role update
        } else {
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ role: 'vendor' })
                .eq('id', values.user_id);

            if (updateError) {
                throw new Error(`Failed to update user role to vendor: ${updateError.message}`);
            }
        }

        // Verify the update worked
        const { data: updatedProfile, error: verifyError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', values.user_id)
            .single();

        if (verifyError) {
            // Error verifying role update
        }

        // Step 2: Create vendor record with agreement_accepted = false
        const { data: newVendor, error: insertError } = await supabase
            .from('vendors')
            .insert({
                user_id: values.user_id,
                store_name: values.store_name,
                contact_number: values.contact_number || null,
                description: values.description || null,
                is_verified: values.is_verified,
                subscription_start_date: values.subscription_start_date?.toISOString() || null,
                subscription_end_date: values.subscription_end_date?.toISOString() || null,
                agreement_accepted: false, // New vendors must accept agreement on first login
            })
            .select()
            .single();

        if (insertError) {
            // Rollback: Change role back to customer
            const { error: rollbackError } = await supabase
                .from('user_profiles')
                .update({ role: 'customer' })
                .eq('id', values.user_id);

            if (rollbackError) {
                throw new Error(`Vendor creation failed and role rollback also failed. User role may be inconsistent. Original error: ${insertError.message}`);
            }

            throw new Error(`Failed to create vendor profile: ${insertError.message}`);
        }
      }
      router.push('/admin/vendors');
      router.refresh();
    } catch (error: any) {
      // Handle operation errors
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Vendor" : "Create New Vendor Profile"}</CardTitle>
        <CardDescription>
          {isEditing ? `Editing profile for ${vendor?.user?.name || 'vendor'}.` : "Select a customer to create a vendor profile for them."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Select User</FormLabel>
                  {isEditing ? (
                     <Input value={vendor?.user?.email || field.value} disabled />
                  ) : (
                    <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            disabled={isLoadingCustomers}
                          >
                            {isLoadingCustomers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {field.value
                              ? availableCustomers.find((c) => c.id === field.value)?.name
                              : "Select a customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                           <CommandInput placeholder="Search customers..." />
                           <CommandList>
                            <CommandEmpty>No available customers found.</CommandEmpty>
                            <CommandGroup>
                              {availableCustomers.map((customer) => (
                                <CommandItem
                                  value={customer.name}
                                  key={customer.id}
                                  onSelect={() => {
                                    form.setValue("user_id", customer.id);
                                    setCustomerComboboxOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                                  <div>
                                    <p>{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                           </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormControl><Input placeholder="e.g., Kweku's Fresh Produce" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{customerError}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please check the browser console for more details or contact support.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl><Input type="tel" placeholder="e.g., 0241234567" {...field} /></FormControl>
                  <FormDescription>
                    This number will be used for the "Contact on WhatsApp" button on the vendor's storefront.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="store_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Kweku's Fresh Produce" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="A short description of the store and its products." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="subscription_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Subscription Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>The vendor can manage products and be visible on the site from this date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="subscription_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Subscription End Date</FormLabel>
                       <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>The vendor's products and storefront will be hidden after this date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="is_verified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Special Verification Status</FormLabel>
                    <FormDescription>Mark this vendor as having a special status. This does not affect storefront visibility.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Vendor Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
