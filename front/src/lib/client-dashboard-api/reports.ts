import {
  notifyAdminClientReport,
  notifyClientReportReceipt,
} from '@/hooks/useCreateNotification';
import { apiRequest } from '@/lib/api';
import type { ClientIssueReportInput } from './types';

export async function submitClientIssueReport(input: ClientIssueReportInput) {
  await apiRequest('/marketplace/client/reports', {
    method: 'POST',
    body: JSON.stringify({
      reported: input.targetLabel,
      target_id: String(input.targetId),
      target_table: input.targetTable,
      type: input.type,
      reason: input.reason,
      description: input.description,
      priority: input.priority,
    }),
  });

  await Promise.all([
    notifyAdminClientReport(input.adminMessage, input.user.avatar ?? undefined),
    notifyClientReportReceipt(input.user.id, input.userMessage, input.userLink),
  ]);
}
