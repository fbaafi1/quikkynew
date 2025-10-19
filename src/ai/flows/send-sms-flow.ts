
'use server';
/**
 * @fileOverview SMS utility - Mock implementation (Twilio removed)
 *
 * This file provides SMS functionality without external dependencies.
 * In a real application, you would integrate with an SMS service provider.
 */

// Mock implementation - no external dependencies
interface SendSmsInput {
  to: string; // The recipient phone number in E.164 format (e.g., +233241234567).
  body: string; // The text content of the SMS message.
}

export async function sendSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string }> {
  console.log(`[MOCK SMS] Would send SMS to ${input.to}: ${input.body}`);

  // Simulate successful SMS sending
  const mockMessageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // In a real implementation, you would:
  // 1. Validate phone number format
  // 2. Send via SMS provider (Twilio, AWS SNS, etc.)
  // 3. Handle delivery status

  return {
    success: true,
    messageId: mockMessageId
  };
}
