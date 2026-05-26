import { type Course, type CourseProgramSection } from './programmeModel';

interface CourseProgramSummaryProps {
  course: Course;
  sections: CourseProgramSection[];
  readinessIssues: string[];
  lessonCount: number;
  previewCount: number;
  publishedCount: number;
  assetCount: number;
}

export default function CourseProgramSummary({
  course,
  sections,
  readinessIssues,
  lessonCount,
  previewCount,
  publishedCount,
  assetCount,
}: CourseProgramSummaryProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 mb-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold mb-2">{course.category}</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h2>
            <p className="text-sm text-gray-600 leading-6">
              {course.description || 'Ajoutez une description pour clarifier la promesse pédagogique de ce cours.'}
            </p>
          </div>
          <div className="min-w-[180px] text-sm text-gray-600 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span>Durée estimée</span>
              <strong className="text-gray-900">{course.duration || 'Non définie'}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Sections</span>
              <strong className="text-gray-900">{sections.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Leçons</span>
              <strong className="text-gray-900">{lessonCount}</strong>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {readinessIssues.length > 0
            ? `Avant soumission, il manque ${readinessIssues.join(', ')}.`
            : course.status === 'review'
              ? 'Cette formation est actuellement en attente de validation admin.'
              : course.status === 'published'
                ? 'Cette formation est en ligne. Archivez-la si vous souhaitez la retirer du catalogue.'
                : course.status === 'rejected'
                  ? 'Cette formation a été rejetée. Reprenez-la en brouillon pour la corriger.'
                  : course.status === 'archived'
                    ? 'Cette formation est archivée et n apparaît plus dans le catalogue.'
                    : 'Le programme est prêt pour une soumission en révision.'}
        </div>
      </div>

      <aside className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Vue d ensemble</h3>
        <div className="space-y-4">
          <SummaryStat label="Structure" value={`${sections.length} section${sections.length > 1 ? 's' : ''}`} />
          <SummaryStat label="Leçons publiées" value={publishedCount} />
          <SummaryStat label="Leçons en aperçu" value={previewCount} />
          <SummaryStat label="Contenus attachés" value={assetCount} />
        </div>
      </aside>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
