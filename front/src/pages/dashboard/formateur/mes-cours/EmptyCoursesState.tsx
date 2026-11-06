/** Empty states of « Mes formations »: no match for the filters, or no course yet. */
export function EmptyCoursesState({ hasCourses, onCreate }: { hasCourses: boolean; onCreate: () => void }) {
  if (hasCourses) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ri-search-line text-2xl text-gray-400"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune formation trouvée</h3>
        <p className="text-gray-600">Ajustez votre recherche ou le filtre de statut.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i className="ri-video-add-line text-3xl text-teal-600"></i>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Créez votre première formation</h3>
      <p className="text-gray-600 mb-6">
        Trois questions pour démarrer, puis construisez votre programme à votre rythme : tout est enregistré automatiquement.
      </p>
      <button onClick={onCreate} className="px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
        Créer une formation
      </button>
    </div>
  );
}
