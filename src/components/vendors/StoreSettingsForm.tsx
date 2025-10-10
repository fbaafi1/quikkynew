
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
import type { Vendor } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const storeSettingsSchema = z.object({
  store_name: z.string().min(3, { message: "Store name must be at least 3 characters." }),
  description: z.string().max(300, "Description cannot exceed 300 characters.").optional(),
  contact_number: z.string().regex(/^0[235]\d{8}$/, "Enter a valid Ghanaian number (e.g., 024xxxxxxx)").optional().or(z.literal('')),
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

export default function StoreSettingsForm({ initialData }: { initialData: Partial<Vendor> | null }) {
  const { currentUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      store_name: initialData?.store_name || "",
      description: initialData?.description || "",
      contact_number: initialData?.contact_number || "",
    },
  });

  async function onSubmit(values: StoreSettingsFormValues) {
    if (!currentUser) return;
    setIsLoading(true);
    
    try {
        const { error } = await supabase
            .from('vendors')
            .update({
                store_name: values.store_name,
                description: values.description || null,
                contact_number: values.contact_number || null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', currentUser.id);

        if (error) throw error;

        toast({ title: "Success", description: "Your store details have been updated." });
        router.push('/vendor/dashboard');
        router.refresh();
    } catch (err: any) {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }
  
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Update Your Store Details</CardTitle>
        <CardDescription>
          This information is visible to customers on your storefront page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="store_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your public store name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell customers about your store..." {...field} maxLength={300} rows={4} />
                  </FormControl>
                   <FormDescription>A brief description of what you sell. (Max 300 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Contact Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g., 0241234567" {...field} />
                  </FormControl>
                  <FormDescription>Customers will use this number to contact you via WhatsApp from your storefront.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
