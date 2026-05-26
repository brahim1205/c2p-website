import { Link } from 'react-router-dom';
import { SkeletonList } from '@/components/base/Skeleton';
import LearnerIdentity from './LearnerIdentity';
import {
  formatDate,
  formatRelativeActivity,
  getAttentionBadge,
  getCertificateBadge,
  getProgressColor,
  getStatusBadge,
  type Enrollment,
  type StudentDetail,
  type StudentDetailStats,
} from './apprenantsModel';

interface LearnerDetailModalProps {
  detailLoading: boolean;
  detailStats: StudentDetailStats;
  selectedStudent: Enrollment;
  studentDetail?: StudentDetail;
  onClose: () => void;
  onMessage: (student: Enrollment) => void;
}

export default function LearnerDetailModal({ detailLoading, detailStats, selectedStudent, studentDetail, onClose, onMessage }: LearnerDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <LearnerIdentity student={selectedStudent} size="lg" />
          </div>

          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100" aria-label="Fermer le détail">
            <i className="ri-close-line text-xl text-gray-500" />
          </button>
        </div>

        {detailLoading ? (
          <SkeletonList count={4} />
        ) : (
          <>
            <LearnerDetailStatsGrid stats={detailStats} />
            <LearnerEnrollmentsSection enrollments={studentDetail?.enrollments || []} selectedStudent={selectedStudent} onClose={onClose} onMessage={onMessage} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <LearnerSubmissionsSection selectedStudent={selectedStudent} submissions={studentDetail?.submissions || []} />
              <LearnerCertificatesSection certificates={studentDetail?.certificates || []} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LearnerDetailStatsGrid({ stats }: { stats: StudentDetailStats }) {
  const cards = [
    { label: 'Formations suivies', value: String(stats.courseCount), icon: 'ri-book-open-line', color: 'bg-teal-500' },
    { label: 'Progression moyenne', value: `${stats.avgProgress}%`, icon: 'ri-bar-chart-line', color: 'bg-blue-500' },
    { label: 'Évaluations soumises', value: String(stats.submissionsCount), icon: 'ri-file-list-3-line', color: 'bg-amber-500' },
    { label: 'Certificats', value: String(stats.certificatesCount), icon: 'ri-award-line', color: 'bg-violet-500' },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              <i className={`${stat.icon} text-sm text-white`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LearnerEnrollmentsSection({ enrollments, selectedStudent, onClose, onMessage }: { enrollments: Enrollment[]; selectedStudent: Enrollment; onClose: () => void; onMessage: (student: Enrollment) => void }) {
  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Parcours sur vos formations</h4>
        <button onClick={() => onMessage(selectedStudent)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
          Envoyer un message
        </button>
      </div>

      <div className="space-y-4">
        {enrollments.map((enrollment) => (
          <EnrollmentCard key={enrollment.id} enrollment={enrollment} onClose={onClose} />
        ))}
        {enrollments.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aucun parcours trouvé sur vos formations.
          </div>
        )}
      </div>
    </section>
  );
}

function EnrollmentCard({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h5 className="font-semibold text-gray-900">{enrollment.course_name || 'Formation'}</h5>
            {getStatusBadge(enrollment.status)}
            {getAttentionBadge(enrollment.attention_level)}
            {getCertificateBadge(enrollment.certificate_status)}
          </div>
          <p className="text-sm text-gray-600">{enrollment.course_category || enrollment.courses?.category || 'Formation'}</p>
        </div>

        <Link to={`/dashboard/formateur/mes-cours/${enrollment.course_id}/programme`} onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          Voir le programme
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProgressMetric enrollment={enrollment} />
        <Metric label="Leçons estimées" value={`${enrollment.completed_lessons_estimate || 0}/${enrollment.course_lessons_count || 0}`} />
        <Metric label="Évaluations" value={`${enrollment.graded_submissions_count || 0}/${enrollment.submissions_count || 0} corrigées`} />
        <Metric label="Dernière activité" value={formatRelativeActivity(enrollment.days_since_active)} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{enrollment.completed_sections_estimate || 0}/{enrollment.course_sections_count || 0} sections</span>
        <span>{enrollment.pending_grading_count || 0} correction(s) en attente</span>
        <span>Note moyenne: {enrollment.avg_submission_grade !== null && enrollment.avg_submission_grade !== undefined ? `${enrollment.avg_submission_grade}` : 'N/A'}</span>
        <span>Dernier accès: {formatDate(enrollment.last_active)}</span>
        {enrollment.certificate_number && <span>Certificat: {enrollment.certificate_number}</span>}
      </div>
    </div>
  );
}

function ProgressMetric({ enrollment }: { enrollment: Enrollment }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="mb-1 text-xs text-gray-500">Progression</p>
      <div className="flex items-center gap-2">
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div className={`${getProgressColor(enrollment.progress)} h-2 rounded-full`} style={{ width: `${enrollment.progress}%` }} />
        </div>
        <span className="text-sm font-semibold text-gray-900">{enrollment.progress}%</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function LearnerSubmissionsSection({ selectedStudent, submissions }: { selectedStudent: Enrollment; submissions: StudentDetail['submissions'] }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4">
      <h4 className="mb-4 text-lg font-semibold text-gray-900">Évaluations récentes</h4>
      <div className="space-y-3">
        {submissions.slice(0, 6).map((submission) => (
          <div key={submission.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{submission.exam?.title || 'Évaluation'}</p>
                <p className="text-xs text-gray-500">{submission.exam?.course_name || selectedStudent.course_name || 'Formation'} • {formatDate(submission.submitted_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {submission.grade !== null && submission.grade !== undefined ? `${submission.grade}/${submission.exam?.max_grade ?? 20}` : 'À corriger'}
                </p>
                <p className="text-xs text-gray-500">{submission.status === 'graded' ? 'Corrigé' : 'En attente'}</p>
              </div>
            </div>
            {submission.feedback && <p className="mt-2 text-xs text-gray-600">{submission.feedback}</p>}
          </div>
        ))}

        {submissions.length === 0 && <p className="text-sm text-gray-500">Aucune évaluation soumise pour le moment.</p>}
      </div>
    </section>
  );
}

function LearnerCertificatesSection({ certificates }: { certificates: StudentDetail['certificates'] }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4">
      <h4 className="mb-4 text-lg font-semibold text-gray-900">Certificats</h4>
      <div className="space-y-3">
        {certificates.map((certificate) => (
          <div key={certificate.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{certificate.course_name || 'Certificat'}</p>
                <p className="text-xs text-gray-500">{certificate.issued_at ? `Émis le ${formatDate(certificate.issued_at)}` : 'En attente d’émission'}</p>
              </div>
              <div className="text-right">
                {getCertificateBadge(certificate.status)}
                {certificate.certificate_number && <p className="mt-1 text-xs text-gray-500">{certificate.certificate_number}</p>}
              </div>
            </div>
            {certificate.final_grade !== null && certificate.final_grade !== undefined && <p className="mt-2 text-xs text-gray-600">Note finale: {certificate.final_grade}</p>}
          </div>
        ))}

        {certificates.length === 0 && <p className="text-sm text-gray-500">Aucun certificat délivré sur vos formations.</p>}
      </div>
    </section>
  );
}
