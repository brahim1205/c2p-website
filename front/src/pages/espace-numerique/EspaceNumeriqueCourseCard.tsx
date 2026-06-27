import { Link } from 'react-router-dom';
import {
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import {
  formatCoursePrice,
  getCategoryLabel,
  getCourseImage,
  type Course,
} from './espaceNumeriquePageModel';

export default function EspaceNumeriqueCourseCard({
  formation,
  onEnroll,
}: {
  formation: Course;
  onEnroll: (course: Course) => void;
}) {
  const price = formatCoursePrice(formation.current_price ?? formation.price);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#e7eaf4] bg-white shadow-[0_12px_35px_rgba(16,24,63,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(16,24,63,0.10)]">
      <Link to={`/espace-numerique/formation/${formation.id}`} className="block">
        <div className="relative h-40 overflow-hidden">
          <img
            src={getCourseImage(formation)}
            alt={formation.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-[#6f63d8] px-3 py-1 text-[10px] font-black text-white">
            {getCourseDeliveryLabel(formation.delivery_mode)}
          </span>
        </div>
      </Link>

      <div className="p-4">
        <p className="text-[11px] font-bold text-[#8b93aa]">{getCategoryLabel(formation.category)}</p>
        <Link to={`/espace-numerique/formation/${formation.id}`}>
          <h3 className="mt-2 min-h-[44px] text-sm font-black leading-snug text-[#10183f] transition hover:text-[#6f63d8]">
            {formation.title}
          </h3>
        </Link>
        <p className="mt-2 truncate text-xs font-semibold text-[#68718b]">
          <i className="ri-user-line mr-1"></i>
          {formation.instructor_name || 'Formateur C2P'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-[#f5a623]">
            <i className="ri-star-fill"></i>
            {Number(formation.rating || 4.8).toFixed(1)}
            <span className="text-[#9aa2b8]">({formation.students_count || 0})</span>
          </span>
          <span className="text-sm font-black text-[#10183f]">{price}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onEnroll(formation)}
            className="rounded-xl bg-[#6f63d8] px-3 py-2 text-xs font-black text-white transition hover:bg-[#5d52c4]"
          >
            Accéder
          </button>
          <Link
            to={`/espace-numerique/formation/${formation.id}`}
            className="rounded-xl border border-[#dfe3ef] px-3 py-2 text-center text-xs font-black text-[#6f63d8] transition hover:bg-[#f6f4ff]"
          >
            Détails
          </Link>
        </div>
      </div>
    </article>
  );
}
