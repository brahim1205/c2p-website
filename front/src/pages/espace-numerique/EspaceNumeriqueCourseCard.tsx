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
    <div className="group overflow-hidden rounded-[22px] border border-[#e1e8e5] bg-white shadow-[0_18px_44px_rgba(15,28,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,28,53,0.1)]">
      <Link to={`/espace-numerique/formation/${formation.id}`}>
        <div className="relative h-48 overflow-hidden p-3">
          <img
            src={getCourseImage(formation)}
            alt={formation.title}
            className="h-full w-full rounded-2xl object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-3 bottom-3 h-20 rounded-b-2xl bg-gradient-to-t from-black/45 to-transparent"></div>
          <div className="absolute left-6 top-6 flex flex-wrap gap-2">
            <div className="rounded-full bg-[#147f7b] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
              {getCategoryLabel(formation.category)}
            </div>
          </div>
          <div className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#102033] shadow-sm">
            <i className="ri-heart-line" />
          </div>
          <div className="absolute bottom-6 left-6 flex items-center gap-2 text-xs font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <i className="ri-user-line" />
            </span>
            {formation.instructor_name || 'Formateur C2P'}
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5">
        <Link to={`/espace-numerique/formation/${formation.id}`}>
          <h3 className="min-h-[54px] text-lg font-black leading-snug text-[#102033] transition-colors hover:text-[#147f7b]">
            {formation.title}
          </h3>
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-[#607083]">
          <span className="inline-flex items-center gap-1">
            <i className="ri-time-line text-[#147f7b]" />
            {formation.duration || 'N/A'}
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="ri-book-line text-[#147f7b]" />
            {formation.modules || 0} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <i className={getCourseDeliveryIcon(formation.delivery_mode)} />
            {getCourseDeliveryLabel(formation.delivery_mode)}
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="ri-group-line text-[#147f7b]" />
            {formation.students_count || 0} apprenants
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#eef9f4] px-3 py-1 text-[11px] font-bold text-[#147f7b]">
            {getCourseLevelLabel(formation.level)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getCourseBranchBadgeClass(formation.program_branch)}`}>
            {getPublicBranchLabel(formation.program_branch)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold ${getCourseDeliveryBadgeClass(formation.delivery_mode)}`}>
            <i className={getCourseDeliveryIcon(formation.delivery_mode)} />
            {getCourseDeliveryLabel(formation.delivery_mode)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#edf1ef] pt-4">
          <div>
            <div className="text-lg font-black text-[#147f7b]">
              {formatCoursePrice(formation.current_price ?? formation.price)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-[#f5a623]">
              {Number(formation.rating || 4.8).toFixed(1)} <i className="ri-star-fill" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`S’inscrire à la formation ${formation.title}`}
              onClick={() => onEnroll(formation)}
              className="rounded-xl bg-[#147f7b] px-3.5 py-2 text-xs font-black text-white transition hover:bg-[#0f6b68]"
            >
              {normalizeCourseBranch(formation.program_branch) === 'end' ? 'Rejoindre' : 'Accéder'}
            </button>
            <Link
              to={`/espace-numerique/formation/${formation.id}`}
              className="rounded-xl border border-[#dbe7e2] px-3.5 py-2 text-xs font-black text-[#102033] transition hover:border-[#147f7b] hover:text-[#147f7b]"
            >
              Détails
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
