import type { ProjectSubmissionPayload } from '@/lib/projectCenterApi';

export type SubmitProjectFormData = ProjectSubmissionPayload;

export const TOTAL_SUBMIT_PROJECT_STEPS = 5;

export const PROJECT_CATEGORIES = [
  'Technologies',
  'Agriculture',
  'Commerce',
  'Éducation',
  'Santé',
  'Artisanat',
  'Énergie',
  'Transport',
  'Finance',
  'Autre',
];

export const INITIAL_SUBMIT_PROJECT_FORM: SubmitProjectFormData = {
  projectName: '',
  category: '',
  stage: '',
  location: '',
  shortDescription: '',
  problemStatement: '',
  solution: '',
  targetMarket: '',
  businessModel: '',
  competition: '',
  founderName: '',
  founderEmail: '',
  founderPhone: '',
  founderBio: '',
  teamSize: '',
  projectDurationMonths: '',
  fundingGoal: '',
  fundingType: '',
  currentFunding: '',
  useOfFunds: '',
  partnerNeeds: [],
  businessPlan: null,
  pitchDeck: null,
  financialProjections: null,
};

export const STEP_LABELS: Record<number, string> = {
  1: 'Informations',
  2: 'Description',
  3: 'Équipe',
  4: 'Financement',
  5: 'Documents',
};

export const PARTNER_NEED_OPTIONS = [
  {
    id: 'Partenaire financier',
    icon: 'ri-bank-card-line',
    description: 'Pour le financement, l’investissement ou la structuration de la levée.',
  },
  {
    id: 'Partenaire technique',
    icon: 'ri-cpu-line',
    description: 'Pour le produit, la tech, l’intégration ou le support opérationnel.',
  },
];
