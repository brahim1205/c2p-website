import type { Exam } from './evaluationModel';

export function ExamPublicationSection({
  newExam,
  updateNewExam,
}: {
  newExam: Partial<Exam>;
  updateNewExam: (field: keyof Exam, value: unknown) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 p-4">
      <h4 className="mb-4 text-sm font-bold text-gray-900">Publication</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { value: 'ongoing', label: 'Publier maintenant', description: 'Visible immédiatement dans l’espace apprenant.', icon: 'ri-eye-line' },
          { value: 'upcoming', label: 'Garder planifié', description: 'Créé côté formateur, masqué aux apprenants.', icon: 'ri-calendar-schedule-line' },
        ].map((statusOption) => {
          const selected = (newExam.status || 'ongoing') === statusOption.value;
          return (
            <button
              key={statusOption.value}
              type="button"
              onClick={() => updateNewExam('status', statusOption.value)}
              aria-pressed={selected}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? 'border-teal-500 bg-teal-50 text-teal-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 font-bold">
                <i className={`${statusOption.icon} text-lg`} />
                {statusOption.label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-gray-600">{statusOption.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
