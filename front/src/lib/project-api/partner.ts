import { notifyAdminPartnerInterest } from '@/hooks/useCreateNotification';
import { apiRequest } from '../api';
import type {
  Collaboration,
  PartnerDashboardSnapshot,
  PartnerInterestResult,
  PartnerOwnerConversationInput,
  PartnerType,
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
