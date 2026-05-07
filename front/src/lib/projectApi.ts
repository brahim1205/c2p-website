import { backendClient } from './backendClient';

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

async function expectData<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchOwnerProjects(ownerId: string) {
  return (await expectData<ProjectRecord[]>(backendClient.from('projects').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }))) || [];
}

export async function fetchProjectDetail(projectId: number) {
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

export async function fetchPartnershipsForOwner(ownerId: string) {
  const projects = await fetchOwnerProjects(ownerId);
  const ids = projects.map((project) => project.id);
  if (!ids.length) return [];
  return (await expectData<ProjectPartnership[]>(
    backendClient.from('project_partnerships').select('*').in('project_id', ids).order('id', { ascending: true }),
  )) || [];
}

export async function fetchTrackedProjects(partnerId: string) {
  return (await expectData<TrackedProject[]>(
    backendClient.from('project_tracking').select('*').eq('partner_id', partnerId).order('last_update', { ascending: false }),
  )) || [];
}

export async function fetchCollaborations(partnerId: string) {
  return (await expectData<Collaboration[]>(
    backendClient.from('project_collaborations').select('*').eq('partner_id', partnerId).order('start_date', { ascending: false }),
  )) || [];
}

export async function fetchOpenProjects() {
  return (await expectData<ProjectRecord[]>(
    backendClient.from('projects').select('*').order('created_at', { ascending: false }),
  )) || [];
}
