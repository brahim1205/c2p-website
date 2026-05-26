export function getScoreMessage(score: number, total: number): string {
  if (total <= 0) return 'Aucune question disponible pour ce quiz.';
  const pct = (score / total) * 100;
  if (pct === 100) return 'Parfait ! Vous maîtrisez ce sujet.';
  if (pct >= 80) return 'Excellent travail ! Presque parfait.';
  if (pct >= 60) return 'Bon score. Quelques révisions nécessaires.';
  if (pct >= 40) return 'Score moyen. Continuez à réviser.';
  return 'À retravailler. Ne vous découragez pas !';
}

export function getScoreColor(score: number, total: number): string {
  if (total <= 0) return 'text-slate-600';
  const pct = (score / total) * 100;
  if (pct === 100) return 'text-emerald-600';
  if (pct >= 80) return 'text-teal-600';
  if (pct >= 60) return 'text-amber-600';
  if (pct >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBg(score: number, total: number): string {
  if (total <= 0) return 'bg-slate-50 border-slate-200';
  const pct = (score / total) * 100;
  if (pct === 100) return 'bg-emerald-50 border-emerald-200';
  if (pct >= 80) return 'bg-teal-50 border-teal-200';
  if (pct >= 60) return 'bg-amber-50 border-amber-200';
  if (pct >= 40) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

export function getAnswerLabel(index: number) {
  return ['A', 'B', 'C', 'D'][index] ?? String(index + 1);
}
