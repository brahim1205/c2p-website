import { z } from 'zod';

export const operatorActionSchema = z.object({
  reason: z.string().trim().min(3).max(240).optional(),
});

export type OperatorActionDto = z.infer<typeof operatorActionSchema>;
