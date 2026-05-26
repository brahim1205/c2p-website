import { getExamStatusMeta, getSubmissionStatusMeta } from './evaluationModel';

interface EvaluationStatusBadgeProps {
  status: string;
  kind: 'exam' | 'submission';
}

export default function EvaluationStatusBadge({ status, kind }: EvaluationStatusBadgeProps) {
  const meta = kind === 'exam' ? getExamStatusMeta(status) : getSubmissionStatusMeta(status);
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}
