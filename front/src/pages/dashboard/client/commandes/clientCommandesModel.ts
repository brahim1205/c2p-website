export interface ReportForm {
  orderId: number | null;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export const emptyReportForm: ReportForm = {
  orderId: null,
  reason: '',
  description: '',
  priority: 'medium',
};
