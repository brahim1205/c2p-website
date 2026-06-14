import { Link } from 'react-router-dom';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import {
  getCourseBranchBadgeClass,
  getCourseBranchDescription,
  getCourseBranchLabel,
} from '@/lib/courseBranch';
import {
  formatCoursePrice,
  getCourseImage,
  isPaidCourse,
  normalizeCourseLevel,
  type Course,
  type FormationDetailTab,
} from './formationDetailModel';

export { FormationContextSidebar } from './FormationContextSidebar';
export { CurriculumTab } from './FormationCurriculumTab';
export { ReviewsTab } from './FormationReviewsTab';

export function FormationHero({
  course,
  totalLessons,
  previewLessons,
  hasEnrollment,
  onEnroll,
}: {
  course: Course;
  totalLessons: number;
  previewLessons: number;
  hasEnrollment: boolean;
  onEnroll: () => void;
}) {
  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="absolute inset-0 opacity-30">
        <img src={getCourseImage(course)} alt="" className="w-full h-full object-cover object-top" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/88 to-slate-900/78"></div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link to="/espace-numerique" className="inline-flex items-center space-x-2 text-sm text-gray-300 hover:text-white mb-6">
          <i className="ri-arrow-left-line"></i>
          <span>Retour aux formations</span>
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-500 px-3 py-1 text-xs font-medium text-white sm:text-sm">
                {course.category}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${getCourseBranchBadgeClass(course.program_branch)}`}>
                {getCourseBranchLabel(course.program_branch)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${getCourseDeliveryBadgeClass(course.delivery_mode)}`}>
                <i className={getCourseDeliveryIcon(course.delivery_mode)}></i>
                <span>{getCourseDeliveryLabel(course.delivery_mode)}</span>
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 sm:text-sm">
                {normalizeCourseLevel(course.level)}
              </span>
            </div>

            <h1 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl">{course.title}</h1>
            <p className="mb-5 max-w-3xl text-base font-medium leading-8 text-white sm:mb-6 sm:text-lg">
              {course.description || 'Formation professionnelle de qualité pour développer vos compétences.'}
            </p>

            <div className="mb-5 flex flex-wrap items-center gap-4 sm:mb-6 sm:gap-6">
              <HeroMetric icon="ri-group-line" label={`${course.students_count || 0} apprenants`} />
              <HeroMetric icon="ri-time-line" label={course.duration || 'N/A'} />
              <HeroMetric icon="ri-book-line" label={`${course.modules || 0} modules`} />
              <HeroMetric icon="ri-play-list-line" label={`${totalLessons} leçons`} />
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white sm:h-12 sm:w-12">
                <i className="ri-user-star-line text-xl"></i>
              </div>
              <div>
                <div className="text-sm text-gray-300">Formateur</div>
                <div className="text-base font-medium">{course.instructor_name || 'Équipe pédagogique C2P'}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl bg-white p-4 text-gray-900 shadow-xl sm:p-6">
              <div className="mb-4 aspect-video overflow-hidden rounded-lg">
                <img src={getCourseImage(course)} alt={course.title} className="w-full h-full object-cover object-top" />
              </div>

              <div className="mb-4 text-2xl font-bold text-teal-600 sm:text-3xl">
                {formatCoursePrice(course)}
              </div>

              <button
                type="button"
                onClick={onEnroll}
                className="mb-3 w-full rounded-lg bg-teal-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 sm:px-6 sm:text-base"
              >
                {hasEnrollment
                  ? 'Accéder à mon apprentissage'
                  : isPaidCourse(course)
                    ? 'Payer et accéder à la formation'
                    : 'S’inscrire gratuitement'}
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <HeroDetail label="Branche" value={getCourseBranchLabel(course.program_branch)} />
                <HeroDetail label="Format" value={getCourseDeliveryLabel(course.delivery_mode)} />
                <HeroDetail label="Durée" value={course.duration || 'N/A'} />
                <HeroDetail label="Modules" value={String(course.modules || 0)} />
                <HeroDetail label="Leçons d’aperçu" value={String(previewLessons)} />
                <HeroDetail label="Certificat" value="Oui" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center space-x-2">
      <i className={`${icon} text-base text-gray-300`}></i>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}

function HeroDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function FormationTabs({
  activeTab,
  totalLessons,
  onChange,
}: {
  activeTab: FormationDetailTab;
  totalLessons: number;
  onChange: (tab: FormationDetailTab) => void;
}) {
  const tabs = [
    { id: 'overview' as const, label: 'Vue d’ensemble' },
    { id: 'curriculum' as const, label: `Programme (${totalLessons} leçons)` },
    { id: 'reviews' as const, label: 'Avis' },
  ];

  return (
    <div className="sticky top-16 z-40 border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Navigation de la fiche formation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`course-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`course-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewTab({
  course,
  objectives,
  requirements,
  tools,
}: {
  course: Course;
  objectives: string[];
  requirements: string[];
  tools: string[];
}) {
  return (
    <div className="space-y-8" role="tabpanel" id="course-panel-overview" aria-labelledby="course-tab-overview">
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">Description</h2>
        <p className="text-base text-gray-700 leading-relaxed">
          {course.description || 'Cette formation vous donnera les compétences essentielles pour progresser avec une structure claire et des cas pratiques.'}
        </p>
      </div>

      <div className="rounded-2xl border border-[#d7e6fb] bg-[#f8fbff] px-4 py-4">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getCourseBranchBadgeClass(course.program_branch)}`}>
          {getCourseBranchLabel(course.program_branch)}
        </span>
        <p className="mt-3 text-sm leading-7 text-[#31445f]">
          {getCourseBranchDescription(course.program_branch)}
        </p>
      </div>

      <ChecklistBlock title="Ce que vous allez apprendre" items={objectives} icon="ri-check-line text-teal-600" grid />
      <ChecklistBlock title="Prérequis" items={requirements} icon="ri-checkbox-circle-line text-gray-400" />

      {tools.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">Outils</h2>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <span key={tool} className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistBlock({ title, items, icon, grid = false }: { title: string; items: string[]; icon: string; grid?: boolean }) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
      <div className={grid ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
        {items.map((item) => (
          <div key={item} className="flex items-start space-x-3">
            <i className={`${icon} text-base mt-0.5`}></i>
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
