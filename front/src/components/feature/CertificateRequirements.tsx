import { cx } from '@/components/ui';
import type { CertificateRequirements as Requirements } from '@/lib/apprenantDashboardApi';

const EXAM_STATUS: Record<Requirements['exams'][number]['status'], { label: string; icon: string; tone: string }> = {
  passed: { label: 'Validée', icon: 'ri-checkbox-circle-fill', tone: 'text-c2p-success' },
  failed: { label: 'Non validée', icon: 'ri-close-circle-fill', tone: 'text-c2p-danger' },
  pending_review: { label: 'En correction', icon: 'ri-time-line', tone: 'text-c2p-warning' },
  resubmit: { label: 'Nouvelle version demandée', icon: 'ri-refresh-line', tone: 'text-c2p-warning' },
  not_submitted: { label: 'À passer', icon: 'ri-checkbox-blank-circle-line', tone: 'text-c2p-soft' },
};

/** What is left before a certificate is delivered: lessons, then every exam with its pass mark. */
export default function CertificateRequirements({ requirements, compact = false }: { requirements: Requirements | null | undefined; compact?: boolean }) {
  if (!requirements) {
    return <p className="text-sm text-c2p-muted">Progression en cours de calcul.</p>;
  }
  const { lessons, exams } = requirements;
  const done = (lessons.completed ? 1 : 0) + exams.filter((exam) => exam.status === 'passed').length;
  const total = 1 + exams.length;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs font-semibold text-c2p-muted">
          <span>{done} étape{done > 1 ? 's' : ''} validée{done > 1 ? 's' : ''} sur {total}</span>
          <span className="tabular-nums">{Math.round((done / total) * 100)} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-c2p-surface-muted">
          <div className="h-full rounded-full bg-c2p-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <ul className={cx('space-y-1.5 text-sm', compact && 'text-xs')}>
        <li className="flex items-center gap-2">
          <i className={lessons.completed ? 'ri-checkbox-circle-fill text-c2p-success' : 'ri-play-circle-line text-c2p-primary'} aria-hidden="true" />
          <span className="flex-1 text-c2p-text">Suivre toutes les leçons</span>
          <span className="text-xs tabular-nums text-c2p-muted">{lessons.progress} %</span>
        </li>
        {exams.map((exam) => {
          const meta = EXAM_STATUS[exam.status];
          return (
            <li key={exam.exam_id} className="flex items-center gap-2">
              <i className={cx(meta.icon, meta.tone)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-c2p-text">{exam.title}</span>
              <span className="text-xs text-c2p-muted">
                {exam.grade !== null ? `${exam.grade}/${exam.max_grade} · ` : ''}{meta.label}
                {exam.status !== 'passed' ? ` (min. ${exam.pass_grade}/${exam.max_grade})` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
