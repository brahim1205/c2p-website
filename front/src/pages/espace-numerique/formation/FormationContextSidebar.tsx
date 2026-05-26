import { Link } from 'react-router-dom';
import {
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import {
  getCourseBranchDescription,
  getCourseBranchLabel,
} from '@/lib/courseBranch';
import type { Course, RelatedVirtualClass } from './formationDetailModel';

export function FormationContextSidebar({
  course,
  relatedClasses,
}: {
  course: Course;
  relatedClasses: RelatedVirtualClass[];
}) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Cadre de formation</h3>
        <div className="space-y-4 text-sm text-gray-700">
          <SidebarInfo icon="ri-building-line" title={getCourseBranchLabel(course.program_branch)} description={getCourseBranchDescription(course.program_branch)} />
          <SidebarInfo
            icon={getCourseDeliveryIcon(course.delivery_mode)}
            title={getCourseDeliveryLabel(course.delivery_mode)}
            description={course.delivery_mode === 'onsite'
              ? 'Sessions animées en présentiel avec suivi C2P.'
              : course.delivery_mode === 'hybrid'
                ? 'Parcours mixte avec temps synchrone et séquences en autonomie.'
                : 'Accès à distance avec contenus consultables et suivi progressif.'}
          />
          <SidebarInfo
            icon="ri-user-star-line"
            title={course.instructor_name || 'Équipe pédagogique C2P'}
            description="Animation du parcours et supervision des modules publiés."
          />

          {relatedClasses.length > 0 ? (
            <div className="border-t border-gray-200 pt-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">Sessions liees</p>
              <div className="space-y-3">
                {relatedClasses.slice(0, 2).map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/espace-numerique/classe-virtuelle/${entry.id}`}
                    className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">{entry.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(entry.class_date).toLocaleDateString('fr-FR')} • {entry.class_time}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SidebarInfo({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <i className={`${icon} mt-0.5 text-teal-600`}></i>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
