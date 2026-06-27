interface LessonExerciseBoxProps {
  instructions?: string;
  codeSample?: string;
  codeLanguage?: string;
}

export default function LessonExerciseBox({
  instructions,
  codeSample,
  codeLanguage,
}: LessonExerciseBoxProps) {
  const hasInstructions = Boolean(instructions?.trim());
  const hasCode = Boolean(codeSample?.trim());

  if (!hasInstructions && !hasCode) {
    return (
      <div className="mx-6 mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700">Aucun exercice publié pour cette leçon.</p>
        <p className="mt-1 text-xs text-gray-500">Les consignes apparaîtront ici dès que le formateur les aura ajoutées.</p>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm font-medium text-gray-700">Instructions de l&apos;exercice :</p>
      {hasInstructions ? (
        <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
          {instructions}
        </div>
      ) : null}
      {hasCode ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              {codeLanguage || 'code'}
            </span>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-100">
            <code>{codeSample}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}
