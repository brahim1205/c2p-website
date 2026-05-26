import type { Resource } from '../types';

interface LessonResourcesProps {
  resources: Resource[];
}

export default function LessonResources({ resources }: LessonResourcesProps) {
  if (resources.length === 0) return null;

  return (
    <div className="border-t border-gray-100 px-6 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <i className="ri-download-cloud-line text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Ressources de cette leçon</h2>
            <p className="text-sm text-slate-500">Documents ajoutés par le formateur pour ce passage.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((resource) => (
            <button
              key={resource.id}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-teal-200 hover:bg-teal-50/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <i className={`${resource.icon} text-lg`}></i>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{resource.title}</span>
                  <span className="text-xs text-slate-500">{resource.type} · {resource.size}</span>
                </span>
              </span>
              <i className="ri-download-line flex-shrink-0 text-slate-400"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
