import { BadRequestException } from '@nestjs/common';

export type ProjectSubmissionPayload = {
  projectName: string;
  category: string;
  stage: string;
  location: string;
  shortDescription: string;
  problemStatement: string;
  solution: string;
  targetMarket: string;
  businessModel: string;
  competition?: string;
  founderName: string;
  founderEmail: string;
  founderPhone: string;
  founderBio: string;
  teamSize: string;
  projectDurationMonths: string | number;
  fundingGoal: string | number;
  fundingType: string;
  currentFunding?: string | number;
  useOfFunds: string;
  partnerNeeds?: string[];
  businessPlan?: string | null;
  pitchDeck?: string | null;
  financialProjections?: string | null;
};

export type OwnerProjectUpdatePayload = {
  title: string;
  description: string;
  status: string;
};

export type OwnerFundingRoundCreatePayload = {
  projectId: string | number;
  type: string;
  targetAmount: number;
  deadline: string;
  description: string;
};

export type PartnerInterestPayload = {
  projectId: string | number;
  partnerType: 'technique' | 'financier';
};

export type PartnerCollaborationPatchPayload = {
  status?: string;
  end_date?: string | null;
  value?: number;
  deliverables?: string[];
  meetings?: number;
};

export type PartnerSupportConversationPayload = {
  projectId: string | number;
  projectTitle: string;
};

export function parseProjectSubmissionPayload(payload: unknown): ProjectSubmissionPayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }

  const row = payload as Partial<ProjectSubmissionPayload>;
  const requiredFields: Array<keyof ProjectSubmissionPayload> = [
    'projectName',
    'category',
    'stage',
    'location',
    'shortDescription',
    'problemStatement',
    'solution',
    'targetMarket',
    'businessModel',
    'founderName',
    'founderEmail',
    'founderPhone',
    'founderBio',
    'teamSize',
    'projectDurationMonths',
    'fundingGoal',
    'fundingType',
    'useOfFunds',
  ];

  for (const field of requiredFields) {
    if (String(row[field] ?? '').trim() === '') {
      throw new BadRequestException(`Champ obligatoire manquant: ${field}`);
    }
  }

  return {
    projectName: trimText(row.projectName),
    category: trimText(row.category),
    stage: trimText(row.stage),
    location: trimText(row.location),
    shortDescription: trimText(row.shortDescription),
    problemStatement: trimText(row.problemStatement),
    solution: trimText(row.solution),
    targetMarket: trimText(row.targetMarket),
    businessModel: trimText(row.businessModel),
    competition: trimText(row.competition),
    founderName: trimText(row.founderName),
    founderEmail: trimText(row.founderEmail),
    founderPhone: trimText(row.founderPhone),
    founderBio: trimText(row.founderBio),
    teamSize: trimText(row.teamSize),
    projectDurationMonths: row.projectDurationMonths ?? 0,
    fundingGoal: row.fundingGoal ?? 0,
    fundingType: trimText(row.fundingType),
    currentFunding: row.currentFunding ?? 0,
    useOfFunds: trimText(row.useOfFunds),
    partnerNeeds: Array.isArray(row.partnerNeeds) ? row.partnerNeeds.map(trimText).filter(Boolean) : [],
    businessPlan: optionalTrimText(row.businessPlan),
    pitchDeck: optionalTrimText(row.pitchDeck),
    financialProjections: optionalTrimText(row.financialProjections),
  };
}

export function parseOwnerProjectUpdatePayload(payload: unknown): OwnerProjectUpdatePayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }
  const row = payload as Partial<OwnerProjectUpdatePayload>;
  const title = trimText(row.title);
  const description = trimText(row.description);
  const status = trimText(row.status);
  if (!title || !description || !status) {
    throw new BadRequestException('Titre, description et statut sont obligatoires.');
  }
  return { title, description, status };
}

export function parseOwnerFundingRoundCreatePayload(payload: unknown): OwnerFundingRoundCreatePayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }
  const row = payload as Partial<OwnerFundingRoundCreatePayload>;
  const projectId = row.projectId;
  const type = trimText(row.type);
  const targetAmount = toNonNegativeNumber(row.targetAmount);
  const deadline = trimText(row.deadline);
  const description = trimText(row.description);
  if (projectId === undefined || projectId === null || !type || !deadline || !description) {
    throw new BadRequestException('Projet, type, montant, echeance et description sont obligatoires.');
  }
  if (targetAmount <= 0) {
    throw new BadRequestException('Le montant cible doit etre positif.');
  }
  return { projectId, type, targetAmount, deadline, description };
}

export function parsePartnerInterestPayload(payload: unknown): PartnerInterestPayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }
  const row = payload as Partial<PartnerInterestPayload>;
  if (row.projectId === undefined || row.projectId === null || String(row.projectId).trim() === '') {
    throw new BadRequestException('Projet requis.');
  }
  if (row.partnerType !== 'technique' && row.partnerType !== 'financier') {
    throw new BadRequestException('Type partenaire invalide.');
  }
  return {
    projectId: row.projectId,
    partnerType: row.partnerType,
  };
}

export function parsePartnerCollaborationPatchPayload(payload: unknown): PartnerCollaborationPatchPayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }
  const row = payload as Record<string, unknown>;
  const patch: PartnerCollaborationPatchPayload = {};

  if ('status' in row) {
    const status = trimText(row.status);
    if (!status) {
      throw new BadRequestException('Statut invalide.');
    }
    patch.status = status;
  }

  if ('end_date' in row) {
    patch.end_date = optionalTrimText(row.end_date);
  }

  if ('value' in row) {
    patch.value = toNonNegativeNumber(row.value);
  }

  if ('meetings' in row) {
    const meetings = Number(row.meetings);
    if (!Number.isFinite(meetings) || meetings < 0) {
      throw new BadRequestException('Nombre de reunions invalide.');
    }
    patch.meetings = Math.round(meetings);
  }

  if ('deliverables' in row) {
    if (!Array.isArray(row.deliverables)) {
      throw new BadRequestException('Livrables invalides.');
    }
    patch.deliverables = row.deliverables.map(trimText).filter(Boolean);
  }

  if (Object.keys(patch).length === 0) {
    throw new BadRequestException('Aucune modification fournie.');
  }

  return patch;
}

export function parsePartnerSupportConversationPayload(payload: unknown): PartnerSupportConversationPayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload invalide.');
  }
  const row = payload as Partial<PartnerSupportConversationPayload>;
  if (row.projectId === undefined || row.projectId === null || String(row.projectId).trim() === '') {
    throw new BadRequestException('Projet requis.');
  }
  const projectTitle = trimText(row.projectTitle);
  if (!projectTitle) {
    throw new BadRequestException('Titre du projet requis.');
  }
  return {
    projectId: row.projectId,
    projectTitle,
  };
}

export function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('Montant invalide.');
  }
  return parsed;
}

function trimText(value: unknown) {
  return String(value ?? '').trim();
}

function optionalTrimText(value: unknown) {
  const normalized = trimText(value);
  return normalized || null;
}
