export type CourseBranch = 'form_actions' | 'end';

export function normalizeCourseBranch(value: unknown): CourseBranch {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'end') return 'end';
  return 'form_actions';
}

export function getCourseBranchLabel(value: unknown) {
  return normalizeCourseBranch(value) === 'end' ? 'END' : 'Form Actions';
}

export function getCourseBranchDescription(value: unknown) {
  return normalizeCourseBranch(value) === 'end'
    ? "Parcours rattaché à l'École Numérique de Dakar, avec logique scolaire et classes programmées."
    : 'Parcours rattaché à Form Actions, orienté post-formation, perfectionnement et employabilité.';
}

export function getCourseBranchBadgeClass(value: unknown) {
  return normalizeCourseBranch(value) === 'end'
    ? 'border-[#27346b]/20 bg-[#27346b]/10 text-[#27346b]'
    : 'border-[#dbad29]/30 bg-[#dbad29]/12 text-[#8a6511]';
}
