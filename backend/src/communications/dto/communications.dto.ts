import { z } from 'zod';

export const smsTestSchema = z.object({
  phone: z.string().trim().min(8).max(24),
  message: z.string().trim().min(3).max(480),
});

export const emailTestSchema = z.object({
  email: z.string().trim().email(),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(5000),
});

export const dispatchCampaignSchema = z.object({
  title: z.string().trim().min(3).max(120),
  type: z.enum(['email', 'sms', 'push', 'all']),
  target: z.string().trim().min(3).max(120),
  content: z.string().trim().min(3).max(480),
});

export type EmailTestDto = z.infer<typeof emailTestSchema>;
export type SmsTestDto = z.infer<typeof smsTestSchema>;
export type DispatchCampaignDto = z.infer<typeof dispatchCampaignSchema>;
