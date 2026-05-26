import { apiRequest } from './api';
import type {
  FundingInvestor,
  FundingRound,
  ProjectDocument,
  ProjectHistoryItem,
  ProjectMilestone,
  ProjectPartnership,
} from './projectApi';

export interface PublicProject {
  id: number | string;
  title: string;
  description: string | null;
  category: string;
  sector?: string | null;
  status: string;
  phase: string;
  porteur_name: string;
  location?: string | null;
  impact?: string | null;
  next_milestone?: string | null;
  last_update?: string | null;
  funding: number;
  funding_goal: number;
  team_size: number;
  mentors: number;
  progress?: number;
  image: string | null;
  looking_for: string[];
  created_at: string;
}

export async function fetchPublicProjectCenterProjects() {
  const projects = await apiRequest<PublicProject[]>('/project-center/projects');
  return projects.map((project) => ({
    ...project,
    looking_for: Array.isArray(project.looking_for) ? project.looking_for : [],
  }));
}

export interface PublicProjectDetail {
  project: PublicProject | null;
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  history: ProjectHistoryItem[];
  partnerships: ProjectPartnership[];
  rounds: FundingRound[];
  investors: FundingInvestor[];
  relatedProjects: PublicProject[];
}

export async function fetchPublicProjectCenterDetail(projectId: number | string) {
  const detail = await apiRequest<PublicProjectDetail>(`/project-center/projects/${encodeURIComponent(String(projectId))}`);
  return {
    ...detail,
    project: detail.project
      ? {
          ...detail.project,
          looking_for: Array.isArray(detail.project.looking_for) ? detail.project.looking_for : [],
        }
      : null,
    relatedProjects: (detail.relatedProjects || []).map((project) => ({
      ...project,
      looking_for: Array.isArray(project.looking_for) ? project.looking_for : [],
    })),
  };
}

export interface ProjectSubmissionPayload {
  projectName: string;
  category: string;
  stage: string;
  location: string;
  shortDescription: string;
  problemStatement: string;
  solution: string;
  targetMarket: string;
  businessModel: string;
  competition: string;
  founderName: string;
  founderEmail: string;
  founderPhone: string;
  founderBio: string;
  teamSize: string;
  fundingGoal: string;
  fundingType: string;
  currentFunding: string;
  useOfFunds: string;
  partnerNeeds: string[];
  businessPlan: string | null;
  pitchDeck: string | null;
  financialProjections: string | null;
}

export interface ProjectSubmissionResponse {
  project: {
    id: number | string;
    title: string;
    status: string;
    phase: string;
    created_at?: string;
  };
}

export function submitProjectCenterProject(payload: ProjectSubmissionPayload) {
  return apiRequest<ProjectSubmissionResponse>('/project-center/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
