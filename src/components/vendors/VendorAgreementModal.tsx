"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface VendorAgreementModalProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorAgreementModal({
  vendorId,
  vendorName,
  isOpen,
  onClose
}: VendorAgreementModalProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    if (!isAccepted) return;

    setIsLoading(true);
    try {
      const result = await (supabase
        .from('vendors')
        .update({
          agreement_accepted: true,
          agreement_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', vendorId) as any);

      const { error } = result as any;
      if (error) throw error;

      onClose();
      router.refresh(); // Refresh to update the UI state
    } catch (error) {
      console.error('Error accepting agreement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      // Revert user role back to customer and delete vendor record
      const roleResult = await (supabase
        .from('user_profiles')
        .update({ role: 'customer' })
        .eq('id', vendorId) as any);

      const { error: roleError } = roleResult as any;
      if (roleError) throw roleError;

      const deleteResult = await (supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId) as any);

      const { error: deleteError } = deleteResult as any;
      if (deleteError) throw deleteError;

      onClose();
      // Redirect to home page since vendor account was deleted
      router.push('/');
    } catch (error) {
      console.error('Error declining agreement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Vendor Agreement Required
          </CardTitle>
          <CardDescription>
            Welcome, {vendorName}! Please read and accept the Vendor Terms & Conditions to activate your store.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-4">Welcome to QuiKart Vendor Program.</h3>

              <p className="mb-4">
                Before continuing, please read and accept these key terms:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>You are responsible</strong> for the accuracy of your product listings, images, and prices.</li>
                <li><strong>You agree to communicate clearly</strong> and deliver products honestly to customers.</li>
                <li><strong>QuiKart does not handle payments or deliveries</strong> — all transactions are between you and your buyers.</li>
                <li><strong>Payments are made after delivery</strong> or based on mutual agreement with customers. <strong>QuiKart is not responsible for any payment loss or fraud.</strong></li>
                <li><strong>QuiKart reserves the right to deactivate your store</strong> if you violate these terms.</li>
                <li><strong>Your data and activities must comply</strong> with Ghana's laws and QuiKart's policies.</li>
              </ul>

              <p className="text-sm text-muted-foreground mb-6">
                By clicking "I Accept", you agree to all the above terms and our full Terms of Service.
              </p>
            </div>
          </ScrollArea>
        </CardContent>

        <div className="border-t p-6 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="agreement-accept"
              checked={isAccepted}
              onCheckedChange={(checked) => setIsAccepted(checked as boolean)}
            />
            <label htmlFor="agreement-accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have read and agree to the Vendor Terms & Conditions
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={!isAccepted || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept & Continue
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
