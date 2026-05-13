import { backendClient } from './backendClient';
import {
  notifyAdminOwnerPartnershipRequest,
  notifyAdminPartnerInterest,
} from '@/hooks/useCreateNotification';

export interface ProjectRecord {
  id: number;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  sector?: string | null;
  status: string;
  phase: string;
  porteur_name: string;
  funding: number;
  funding_goal: number;
  team_size: number;
  mentors: number;
  progress: number;
  valuation?: number;
  revenue?: number;
  last_update?: string;
  next_milestone?: string;
  location?: string | null;
  impact?: string | null;
  documents_count?: number;
  reports_count?: number;
  looking_for: string[];
  image: string | null;
  created_at: string;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  progress: number;
  tasks: { id: number; title: string; completed: boolean }[];
}

export interface ProjectDocument {
  id: number;
  project_id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  category: string;
}

export interface ProjectHistoryItem {
  id: number;
  project_id: number;
  date: string;
  user: string;
  action: string;
  type: string;
}

export interface ProjectPartnership {
  id: number;
  project_id: number;
  project_title?: string | null;
  counterpart_user_id?: string;
  name: string;
  role: string;
  type: string;
  avatar: string;
  expertise: string[];
  status: string;
  last_activity: string;
}

export interface FundingRound {
  id: number;
  project_id: number;
  project_title?: string | null;
  type: string;
  target_amount: number;
  raised_amount: number;
  investors?: number;
  deadline: string;
  start_date?: string;
  status: string;
  description?: string;
  pitch_deck?: boolean;
  business_plan?: boolean;
  valuation?: number;
  revenue?: number;
  burn_rate?: number;
  runway?: string;
  next_milestone?: string;
  progress_percent?: number;
}

export interface FundingInvestor {
  id: number;
  funding_round_id: number;
  name: string;
  avatar: string;
  type: string;
  amount: number;
  date: string;
  equity: string;
  status: string;
  notes: string;
}

export interface TrackedProject {
  id: number;
  partner_id: string;
  project_id: number;
  partner_type?: 'technique' | 'financier' | null;
  invested_amount: number;
  roi: number;
  status: string;
  last_update: string;
  next_milestone: string;
  title?: string | null;
  description?: string | null;
  sector?: string | null;
  progress?: number;
  documents?: number;
  reports?: number;
  location?: string | null;
  impact?: string | null;
  team_size?: number;
  revenue?: number;
  valuation?: number;
}

export interface Collaboration {
  id: number;
  partner_id: string;
  project_id: number;
  partner_type?: 'technique' | 'financier' | null;
  project_title?: string | null;
  counterpart_name: string;
  counterpart_role: string;
  type: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  value: number;
  deliverables: string[];
  meetings: number;
}

export interface ProjectDetailPayload {
  project: ProjectRecord | null;
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  history: ProjectHistoryItem[];
  partnerships: ProjectPartnership[];
  rounds: FundingRound[];
}

export interface PartnerInterestResult {
  trackedCreated: boolean;
  collaborationCreated: boolean;
  alreadyTracked: boolean;
}

export type PartnerType = 'technique' | 'financier';

export interface OwnerDashboardSnapshot {
  projects: ProjectRecord[];
  partnerships: ProjectPartnership[];
  rounds: FundingRound[];
}

export interface PartnerDashboardSnapshot {
  trackedProjects: TrackedProject[];
  collaborations: Collaboration[];
  openProjects: ProjectRecord[];
}

export interface OwnerProjectUpdateInput {
  title: string;
  description: string;
  status: string;
}

export interface OwnerFundingRoundCreateInput {
  projectId: number;
  type: string;
  targetAmount: number;
  deadline: string;
  description: string;
}

export interface OwnerPartnershipContactInput {
  counterpartUserId?: string | null;
  counterpartName: string;
  projectTitle?: string | null;
  message?: string;
}

export interface OwnerPartnershipContactResult {
  delivered: boolean;
}

export interface PartnerUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

export interface PartnerOwnerConversationInput {
  partner: PartnerUserProfile;
  ownerId: string;
  ownerName: string;
  projectTitle: string;
}

async function expectData<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

async function requireOwnerProject(ownerId: string, projectId: number) {
  const project = await expectData<ProjectRecord>(
    backendClient.from('projects').select('*').eq('id', projectId).eq('owner_id', ownerId).single(),
  );
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  return project;
}

export async function fetchOwnerProjects(ownerId: string) {
  return (await expectData<ProjectRecord[]>(backendClient.from('projects').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }))) || [];
}

export async function fetchOwnerDashboardSnapshot(ownerId: string): Promise<OwnerDashboardSnapshot> {
  const [projects, partnerships, rounds] = await Promise.all([
    fetchOwnerProjects(ownerId),
    fetchPartnershipsForOwner(ownerId),
    fetchFundingRoundsForOwner(ownerId),
  ]);
  return { projects, partnerships, rounds };
}

export async function fetchProjectDetail(projectId: number): Promise<ProjectDetailPayload> {
  const [project, milestones, documents, history, partnerships, rounds] = await Promise.all([
    expectData<ProjectRecord>(backendClient.from('projects').select('*').eq('id', projectId).single()),
    expectData<ProjectMilestone[]>(backendClient.from('project_milestones').select('*').eq('project_id', projectId).order('due_date', { ascending: true })),
    expectData<ProjectDocument[]>(backendClient.from('project_documents').select('*').eq('project_id', projectId).order('date', { ascending: false })),
    expectData<ProjectHistoryItem[]>(backendClient.from('project_history').select('*').eq('project_id', projectId).order('date', { ascending: false })),
    expectData<ProjectPartnership[]>(backendClient.from('project_partnerships').select('*').eq('project_id', projectId).order('id', { ascending: true })),
    expectData<FundingRound[]>(backendClient.from('project_funding_rounds').select('*').eq('project_id', projectId).order('deadline', { ascending: false })),
  ]);

  return {
    project,
    milestones: milestones || [],
    documents: documents || [],
    history: history || [],
    partnerships: partnerships || [],
    rounds: rounds || [],
  };
}

export async function fetchOwnerProjectDetail(ownerId: string, projectId: number): Promise<ProjectDetailPayload> {
  const ownedProject = await requireOwnerProject(ownerId, projectId);

  const detail = await fetchProjectDetail(projectId);
  return {
    ...detail,
    project: ownedProject,
  };
}

export async function updateOwnerProject(ownerId: string, projectId: number, payload: OwnerProjectUpdateInput) {
  await requireOwnerProject(ownerId, projectId);
  const { error } = await backendClient
    .from('projects')
    .update({
      title: payload.title,
      description: payload.description,
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('owner_id', ownerId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchFundingRoundsForOwner(ownerId: string) {
  const projects = await fetchOwnerProjects(ownerId);
  const ids = projects.map((project) => project.id);
  if (!ids.length) return [];
  return (await expectData<FundingRound[]>(
    backendClient.from('project_funding_rounds').select('*').in('project_id', ids).order('deadline', { ascending: false }),
  )) || [];
}

export async function fetchFundingRoundDetail(roundId: number) {
  const round = await expectData<FundingRound>(backendClient.from('project_funding_rounds').select('*').eq('id', roundId).single());
  const investors = (await expectData<FundingInvestor[]>(
    backendClient.from('funding_investors').select('*').eq('funding_round_id', roundId).order('date', { ascending: false }),
  )) || [];
  const documents = round?.project_id
    ? ((await expectData<ProjectDocument[]>(
        backendClient.from('project_documents').select('*').eq('project_id', round.project_id).order('date', { ascending: false }),
      )) || [])
    : [];
  const history = round?.project_id
    ? ((await expectData<ProjectHistoryItem[]>(
        backendClient.from('project_history').select('*').eq('project_id', round.project_id).order('date', { ascending: false }),
      )) || [])
    : [];

  return { round, investors, documents, history };
}

export async function fetchOwnerFundingRoundDetail(ownerId: string, roundId: number) {
  const round = await expectData<FundingRound>(backendClient.from('project_funding_rounds').select('*').eq('id', roundId).single());
  if (!round) {
    throw new Error('FUNDING_ROUND_NOT_FOUND');
  }
  await requireOwnerProject(ownerId, Number(round.project_id));
  return fetchFundingRoundDetail(roundId);
}

export async function createOwnerFundingRound(ownerId: string, payload: OwnerFundingRoundCreateInput) {
  await requireOwnerProject(ownerId, payload.projectId);
  const { error } = await backendClient.from('project_funding_rounds').insert({
    project_id: payload.projectId,
    type: payload.type,
    target_amount: payload.targetAmount,
    raised_amount: 0,
    deadline: payload.deadline,
    start_date: new Date().toISOString().slice(0, 10),
    status: 'en_cours',
    description: payload.description,
    pitch_deck: false,
    business_plan: false,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchPartnershipsForOwner(ownerId: string) {
  const projects = await fetchOwnerProjects(ownerId);
  const ids = projects.map((project) => project.id);
  if (!ids.length) return [];
  return (await expectData<ProjectPartnership[]>(
    backendClient.from('project_partnerships').select('*').in('project_id', ids).order('id', { ascending: true }),
  )) || [];
}

export async function contactOwnerPartnership(input: OwnerPartnershipContactInput): Promise<OwnerPartnershipContactResult> {
  await notifyAdminOwnerPartnershipRequest(
    input.message?.trim() || `Le porteur souhaite faire le point avec ${input.counterpartName || 'un partenaire'} sur ${input.projectTitle || 'le projet'}.`,
  );
  return { delivered: true };
}

export async function fetchTrackedProjects(partnerId: string) {
  return (await expectData<TrackedProject[]>(
    backendClient.from('project_tracking').select('*').eq('partner_id', partnerId).order('last_update', { ascending: false }),
  )) || [];
}

export async function fetchPartnerDashboardSnapshot(partnerId: string): Promise<PartnerDashboardSnapshot> {
  const [trackedProjects, collaborations, openProjects] = await Promise.all([
    fetchTrackedProjects(partnerId),
    fetchCollaborations(partnerId),
    fetchOpenProjects(),
  ]);
  return {
    trackedProjects,
    collaborations,
    openProjects: openProjects.filter((project) => !trackedProjects.some((tracked) => tracked.project_id === project.id)),
  };
}

export async function fetchTrackedProjectDetail(partnerId: string, projectId: number) {
  const [trackedProjects, detail] = await Promise.all([
    fetchTrackedProjects(partnerId),
    fetchProjectDetail(projectId),
  ]);
  const tracked = trackedProjects.find((item) => Number(item.project_id) === Number(projectId)) || null;
  if (!tracked || !detail.project) {
    throw new Error('TRACKED_PROJECT_NOT_FOUND');
  }
  return {
    tracked,
    detail,
  };
}

export async function fetchCollaborations(partnerId: string) {
  return (await expectData<Collaboration[]>(
    backendClient.from('project_collaborations').select('*').eq('partner_id', partnerId).order('start_date', { ascending: false }),
  )) || [];
}

export async function fetchOpenProjects() {
  const rows = (await expectData<ProjectRecord[]>(
    backendClient.from('projects').select('*').order('created_at', { ascending: false }),
  )) || [];

  return rows.filter((project) => String(project.status || '').toLowerCase() !== 'termine');
}

export async function expressPartnerInterest(
  partnerId: string,
  project: ProjectRecord,
  partnerType: PartnerType,
): Promise<PartnerInterestResult> {
  const collaborationType = partnerType === 'financier' ? 'financement' : 'technique';
  const [existingTracked, collaborationRows] = await Promise.all([
    expectData<TrackedProject>(
      backendClient.from('project_tracking').select('*').eq('partner_id', partnerId).eq('project_id', project.id).maybeSingle(),
    ),
    expectData<Collaboration[]>(
      backendClient.from('project_collaborations').select('*').eq('partner_id', partnerId).eq('project_id', project.id),
    ),
  ]);
  const existingCollaboration = collaborationRows?.[0] ?? null;

  let trackedCreated = false;
  let collaborationCreated = false;

  if (!existingTracked) {
    const { error } = await backendClient.from('project_tracking').insert({
      partner_id: partnerId,
      project_id: project.id,
      partner_type: partnerType,
      invested_amount: 0,
      roi: 0,
      status: 'en_risque',
      last_update: new Date().toISOString(),
      next_milestone: project.next_milestone,
    });
    if (error) throw new Error(error.message);
    trackedCreated = true;
  } else if (existingTracked.partner_type !== partnerType) {
    const { error } = await backendClient.from('project_tracking').update({
      partner_type: partnerType,
      last_update: new Date().toISOString(),
    }).eq('id', existingTracked.id);
    if (error) throw new Error(error.message);
  }

  if (!existingCollaboration) {
    const { error } = await backendClient.from('project_collaborations').insert({
      partner_id: partnerId,
      project_id: project.id,
      partner_type: partnerType,
      counterpart_name: project.porteur_name,
      counterpart_role: 'Porteur de projet',
      type: collaborationType,
      status: 'en_negociation',
      start_date: new Date().toISOString().slice(0, 10),
      value: 0,
      deliverables: ['Prise de contact initiale'],
      meetings: 0,
    });
    if (error) throw new Error(error.message);
    collaborationCreated = true;
  } else if (existingCollaboration.partner_type !== partnerType || existingCollaboration.type !== collaborationType) {
    const { error } = await backendClient.from('project_collaborations').update({
      partner_type: partnerType,
      type: collaborationType,
    }).eq('id', existingCollaboration.id);
    if (error) throw new Error(error.message);
  }

  return {
    trackedCreated,
    collaborationCreated,
    alreadyTracked: !trackedCreated && !collaborationCreated,
  };
}

export async function expressPartnerInterestAndNotify(params: {
  partner: PartnerUserProfile;
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

export async function updatePartnerCollaboration(partnerId: string, collaborationId: number, patch: Partial<Collaboration>) {
  const { error } = await backendClient
    .from('project_collaborations')
    .update(patch)
    .eq('id', collaborationId)
    .eq('partner_id', partnerId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function openPartnerOwnerConversation(input: PartnerOwnerConversationInput) {
  const { data: conversationRows, error: conversationError } = await backendClient
    .from<any>('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const existingConversation = ((conversationRows as any[]) || []).find((conversation) =>
    Array.isArray(conversation.participants)
      && conversation.participants.map(String).includes(input.partner.id)
      && conversation.participants.map(String).includes('usr-admin'),
  );

  let conversationId = existingConversation?.id as string | undefined;
  const now = new Date().toISOString();

  if (!conversationId) {
    const { data: createdConversation, error: createError } = await backendClient
      .from('conversations')
      .insert({
        name: 'Support C2P',
        role: 'Support',
        participants: [input.partner.id, 'usr-admin'],
        type: 'individual',
        members: 2,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (createError) {
      throw new Error(createError.message);
    }
    conversationId = (createdConversation as { id: string }).id;
  }

  const { error: messageError } = await backendClient.from('messages').insert({
    conversation_id: conversationId,
    content: `Bonjour C2P, je souhaite faire un point sur le projet "${input.projectTitle}" et coordonner les prochains echanges.`,
    sender_id: input.partner.id,
    sender_name: `${input.partner.firstName} ${input.partner.lastName}`,
    sender_avatar: input.partner.avatar,
    read: false,
    attachments: [],
    created_at: now,
  });
  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: updateConversationError } = await backendClient
    .from('conversations')
    .update({ updated_at: now })
    .eq('id', conversationId);
  if (updateConversationError) {
    throw new Error(updateConversationError.message);
  }

  return { conversationId };
}
