import { notifyAdminPartnerInterest } from '@/hooks/useCreateNotification';
import { apiRequest } from '../api';
import type {
  Collaboration,
  PartnerDashboardSnapshot,
  PartnerInterestResult,
  PartnerAction,
  PartnerOwnerConversationInput,
  PartnerType,
  ProjectFundingCommitment,
  ProjectFundingSimulation,
  ProjectFundingType,
  ProjectDetailPayload,
  ProjectRecord,
  TrackedProject,
} from './types';

export async function fetchTrackedProjects(partnerId: string) {
  void partnerId;
  return apiRequest<TrackedProject[]>('/project-center/partner/tracked-projects');
}

export async function fetchPartnerDashboardSnapshot(partnerId: string): Promise<PartnerDashboardSnapshot> {
  void partnerId;
  return apiRequest<PartnerDashboardSnapshot>('/project-center/partner/snapshot');
}

export async function fetchTrackedProjectDetail(partnerId: string, projectId: number | string) {
  void partnerId;
  return apiRequest<{ tracked: TrackedProject; detail: ProjectDetailPayload }>(
    `/project-center/partner/tracked-projects/${encodeURIComponent(String(projectId))}`,
  );
}

export async function fetchCollaborations(partnerId: string) {
  void partnerId;
  return apiRequest<Collaboration[]>('/project-center/partner/collaborations');
}

export async function fetchOpenProjects() {
  return apiRequest<ProjectRecord[]>('/project-center/partner/open-projects');
}

export function recordPartnerProjectAction(projectId: number | string, action: PartnerAction, input?: { score?: number; comment?: string }) {
  return apiRequest(`/project-center/partner/projects/${encodeURIComponent(String(projectId))}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action, ...input }),
  });
}

export function simulateProjectFunding(input: {
  projectId: number | string;
  fundingRoundId?: number | string | null;
  amount: number;
  durationMonths: number;
  fundingType: ProjectFundingType;
}) {
  return apiRequest<ProjectFundingSimulation>('/project-center/partner/funding/simulate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createProjectFundingCommitment(input: {
  projectId: number | string;
  fundingRoundId?: number | string | null;
  amount: number;
  durationMonths: number;
  fundingType: ProjectFundingType;
  contractAccepted: boolean;
  riskAccepted: boolean;
}) {
  return apiRequest<{ commitment: ProjectFundingCommitment; simulation: ProjectFundingSimulation }>(
    '/project-center/partner/funding/commitments',
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function fetchProjectFundingCommitments() {
  return apiRequest<ProjectFundingCommitment[]>('/project-center/partner/funding/commitments');
}

export function fetchOwnerProjectFundingCommitments() {
  return apiRequest<ProjectFundingCommitment[]>('/project-center/owner/funding/commitments');
}

export function fetchAdminProjectFundingCommitments() {
  return apiRequest<ProjectFundingCommitment[]>('/project-center/admin/funding/commitments');
}

export function reviewProjectFundingCommitment(commitmentId: number | string, decision: 'approve' | 'reject', reason?: string) {
  return apiRequest<ProjectFundingCommitment>(`/project-center/admin/funding/commitments/${encodeURIComponent(String(commitmentId))}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason }),
  });
}

export function activateProjectFundingCommitment(commitmentId: number | string, paymentReference: string) {
  return apiRequest<ProjectFundingCommitment>(`/project-center/admin/funding/commitments/${encodeURIComponent(String(commitmentId))}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentReference }),
  });
}

export function markProjectFundingInstallmentPaid(commitmentId: number | string, period: number) {
  return apiRequest<ProjectFundingCommitment>(
    `/project-center/admin/funding/commitments/${encodeURIComponent(String(commitmentId))}/installments/${period}/paid`,
    { method: 'PATCH' },
  );
}

export async function expressPartnerInterest(
  partnerId: string,
  project: ProjectRecord,
  partnerType: PartnerType,
): Promise<PartnerInterestResult> {
  void partnerId;
  return apiRequest<PartnerInterestResult>('/project-center/partner/interests', {
    method: 'POST',
    body: JSON.stringify({
      projectId: project.id,
      partnerType,
    }),
  });
}

export async function expressPartnerInterestAndNotify(params: {
  partner: { id: string; avatar?: string | null };
  project: ProjectRecord;
  partnerType: PartnerType;
  ownerMessage: string;
}) {
  const result = await expressPartnerInterest(params.partner.id, params.project, params.partnerType);
  if (!result.alreadyTracked) {
    await notifyAdminPartnerInterest(params.ownerMessage, params.partner.avatar ?? undefined);
  }
  return result;
}

export async function updatePartnerCollaboration(partnerId: string, collaborationId: number | string, patch: Partial<Collaboration>) {
  void partnerId;
  await apiRequest<Collaboration>(`/project-center/partner/collaborations/${encodeURIComponent(String(collaborationId))}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function openPartnerOwnerConversation(input: PartnerOwnerConversationInput) {
  void input.partner;
  void input.ownerId;
  void input.ownerName;
  return apiRequest<{ conversationId: string | number; messageId: string | number }>('/project-center/partner/support-conversations', {
    method: 'POST',
    body: JSON.stringify({
      projectId: input.projectId,
      projectTitle: input.projectTitle,
    }),
  });
}
