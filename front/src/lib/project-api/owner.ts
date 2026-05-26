import { notifyAdminOwnerPartnershipRequest } from '@/hooks/useCreateNotification';
import { apiRequest } from '../api';
import type {
  FundingInvestor,
  FundingRound,
  OwnerDashboardSnapshot,
  OwnerFundingRoundCreateInput,
  OwnerPartnershipContactInput,
  OwnerPartnershipContactResult,
  OwnerProjectUpdateInput,
  ProjectDetailPayload,
  ProjectDocument,
  ProjectHistoryItem,
  ProjectPartnership,
  ProjectRecord,
} from './types';

export async function fetchOwnerProjects(ownerId: string) {
  void ownerId;
  return apiRequest<ProjectRecord[]>('/project-center/owner/projects');
}

export async function fetchOwnerDashboardSnapshot(ownerId: string): Promise<OwnerDashboardSnapshot> {
  void ownerId;
  return apiRequest<OwnerDashboardSnapshot>('/project-center/owner/snapshot');
}

export async function fetchOwnerProjectDetail(ownerId: string, projectId: number | string): Promise<ProjectDetailPayload> {
  void ownerId;
  return apiRequest<ProjectDetailPayload>(`/project-center/owner/projects/${encodeURIComponent(String(projectId))}`);
}

export async function updateOwnerProject(ownerId: string, projectId: number | string, payload: OwnerProjectUpdateInput) {
  void ownerId;
  await apiRequest<ProjectRecord>(`/project-center/owner/projects/${encodeURIComponent(String(projectId))}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      status: payload.status,
    }),
  });
}

export async function fetchFundingRoundsForOwner(ownerId: string) {
  void ownerId;
  return apiRequest<FundingRound[]>('/project-center/owner/funding-rounds');
}

export async function fetchOwnerFundingRoundDetail(ownerId: string, roundId: number) {
  void ownerId;
  return apiRequest<{ round: FundingRound; investors: FundingInvestor[]; documents: ProjectDocument[]; history: ProjectHistoryItem[] }>(
    `/project-center/owner/funding-rounds/${encodeURIComponent(String(roundId))}`,
  );
}

export async function createOwnerFundingRound(ownerId: string, payload: OwnerFundingRoundCreateInput) {
  void ownerId;
  await apiRequest<FundingRound>('/project-center/owner/funding-rounds', {
    method: 'POST',
    body: JSON.stringify({
      projectId: payload.projectId,
      type: payload.type,
      targetAmount: payload.targetAmount,
      deadline: payload.deadline,
      description: payload.description,
    }),
  });
}

export async function fetchPartnershipsForOwner(ownerId: string) {
  void ownerId;
  return apiRequest<ProjectPartnership[]>('/project-center/owner/partnerships');
}

export async function contactOwnerPartnership(input: OwnerPartnershipContactInput): Promise<OwnerPartnershipContactResult> {
  await notifyAdminOwnerPartnershipRequest(
    input.message?.trim() || `Le porteur souhaite faire le point avec ${input.counterpartName || 'un partenaire'} sur ${input.projectTitle || 'le projet'}.`,
  );
  return { delivered: true };
}
