import { Link } from 'react-router-dom';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import {
  getCourseBranchBadgeClass,
  normalizeCourseBranch,
} from '@/lib/courseBranch';
import {
  formatCoursePrice,
  getCategoryLabel,
  getCourseImage,
  getCourseLevelLabel,
  getPublicBranchLabel,
  type Course,
} from './espaceNumeriquePageModel';

export default function EspaceNumeriqueCourseCard({
  formation,
  onEnroll,
}: {
  formation: Course;
  onEnroll: (course: Course) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#27346b]/45 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]">
      <Link to={`/espace-numerique/formation/${formation.id}`}>
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <img
            src={getCourseImage(formation)}
            alt={formation.title}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
            <div className="rounded-full bg-[#27346b] px-2.5 py-1 text-[11px] font-semibold text-white sm:px-3 sm:text-xs">
              {getCategoryLabel(formation.category)}
            </div>
            <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${getCourseBranchBadgeClass(formation.program_branch)}`}>
              {getPublicBranchLabel(formation.program_branch)}
            </div>
            <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${getCourseDeliveryBadgeClass(formation.delivery_mode)}`}>
              <i className={getCourseDeliveryIcon(formation.delivery_mode)}></i>
              <span>{getCourseDeliveryLabel(formation.delivery_mode)}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4 sm:p-5">
        <Link to={`/espace-numerique/formation/${formation.id}`}>
          <h3 className="mb-2 text-base font-semibold text-[#06053a] transition-colors hover:text-[#27346b] sm:text-lg">
            {formation.title}
          </h3>
        </Link>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#27346b] sm:text-xs">
            {getCourseLevelLabel(formation.level)}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${getCourseBranchBadgeClass(formation.program_branch)}`}>
            {getPublicBranchLabel(formation.program_branch)}
          </span>
          <span className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#5fa6f3] sm:text-xs">
            {formation.is_free ? 'Accès gratuit' : 'Accès payant'}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[#27346b] sm:mb-4 sm:gap-4">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-time-line"></i>
            </div>
            <span>{formation.duration || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-book-line"></i>
            </div>
            <span>{formation.modules || 0} modules</span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-group-line text-gray-400 text-sm"></i>
            </div>
            <span className="text-sm text-[#5fa6f3]">
              {formation.students_count || 0} apprenants
            </span>
          </div>
          {formation.instructor_name ? (
            <div className="flex items-center gap-1 text-sm text-[#5fa6f3]">
              <i className="ri-user-star-line text-gray-400 text-sm"></i>
              <span>{formation.instructor_name}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-[#eee4d3] pt-3 sm:pt-4">
          <div className="text-lg font-semibold text-[#27346b] sm:text-xl">
            {formatCoursePrice(formation.current_price ?? formation.price)}
          </div>
          <button
            type="button"
            aria-label={`S’inscrire à la formation ${formation.title}`}
            onClick={() => onEnroll(formation)}
            className="c2p-btn-accent whitespace-nowrap px-3.5 py-2 text-sm"
          >
            {normalizeCourseBranch(formation.program_branch) === 'end' ? "Rejoindre la classe" : "Rejoindre le parcours"}
          </button>
        </div>
      </div>
    </div>
  );
}
