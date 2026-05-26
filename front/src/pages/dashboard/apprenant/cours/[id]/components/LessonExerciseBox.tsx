export default function LessonExerciseBox() {
  return (
    <div className="mx-6 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-sm text-gray-700 mb-3 font-medium">Instructions de l&apos;exercice :</p>
      <div className="bg-white rounded-lg p-3 font-mono text-xs text-gray-700 border border-gray-200">
        <p className="mb-2">{'// Objectif : Appliquez les concepts de cette leçon'}</p>
        <p className="mb-2">{'// Étape 1 : Lisez attentivement l’énoncé'}</p>
        <p className="mb-2">{'// Étape 2 : Réalisez l’exercice dans votre environnement'}</p>
        <p>{'// Étape 3 : Soumettez votre solution pour évaluation'}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors cursor-pointer">
          Télécharger le sujet
        </button>
        <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
          Voir la correction
        </button>
      </div>
    </div>
  );
}
